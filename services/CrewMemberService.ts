import { db, auth } from '../firebase';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  Query,
  DocumentData 
} from 'firebase/firestore';
import { CrewMemberModel, CrewMemberFilters, CrewPosition } from '../types/crewMember';
import AuthService from './AuthService';
import { createUserWithEmailAndPassword } from 'firebase/auth';

class CrewMemberService {
  private readonly COLLECTION_PATH = 'crewMembers'; // CSC path: companies/${companyId}/crewMembers

  /**
   * Get the crew members collection path for a company
   */
  private getCollectionPath(companyId: string): string {
    return `companies/${companyId}/${this.COLLECTION_PATH}`;
  }

  /**
   * Generate a placeholder email if not provided
   */
  private generatePlaceholderEmail(fullName: string, companyName: string): string {
    // Remove spaces and special characters from name
    const sanitizedName = fullName.toLowerCase().replace(/\s+/g, '.');
    const sanitizedCompany = companyName.toLowerCase().replace(/\s+/g, '');
    return `${sanitizedName}@${sanitizedCompany}.com`;
  }

  /**
   * Check if email already exists in crew members
   */
  async checkEmailExists(email: string, companyId: string): Promise<boolean> {
    try {
      const q = query(
        collection(db, this.getCollectionPath(companyId)),
        where('email', '==', email)
      );
      const snapshot = await getDocs(q);
      return !snapshot.empty;
    } catch (error) {
      console.error('[CrewMemberService] Error checking email:', error);
      return false;
    }
  }

  /**
   * Create a new crew member
   */
  async createCrewMember(
    data: Partial<CrewMemberModel>,
    companyName: string = 'company'
  ): Promise<CrewMemberModel> {
    try {
      const currentProfile = AuthService.getCurrentProfile();
      if (!currentProfile) {
        throw new Error('No authenticated user');
      }

      const companyId = currentProfile.companyId || '2XTSaqxU41zCTBIVJeXb';
      const isSiteAdmin = currentProfile.roles?.siteAdmin === true;
      const isAdmin = currentProfile.roles?.admin === true;

      if (!isSiteAdmin && !isAdmin) {
        throw new Error('Insufficient permissions to create crew members');
      }

      // Generate email if not provided
      let email = data.email;
      if (!email && data.fullName) {
        email = this.generatePlaceholderEmail(data.fullName, companyName);
        
        // Check if generated email already exists
        let counter = 1;
        while (await this.checkEmailExists(email, companyId)) {
          email = this.generatePlaceholderEmail(
            `${data.fullName}${counter}`, 
            companyName
          );
          counter++;
        }
      }

      // Determine site assignment
      let siteIds: string[] = [];
      if (isSiteAdmin) {
        // SiteAdmin: auto-assign to their sites
        siteIds = currentProfile.allocatedSiteIds || [];
      } else if (isAdmin && data.primarySiteId) {
        // Admin: use provided site if any
        siteIds = [data.primarySiteId];
      }

      const crewMember: Partial<CrewMemberModel> = {
        ...data,
        email,
        companyId,
        siteIds,
        primarySiteId: siteIds[0] || data.primarySiteId,
        createdBy: currentProfile.id,
        createdByRole: isSiteAdmin ? 'siteAdmin' : 'admin',
        createdAt: serverTimestamp() as any,
        updatedAt: serverTimestamp() as any,
        isActive: true,
      };

      // Add to Firestore
      const docRef = await addDoc(
        collection(db, this.getCollectionPath(companyId)),
        crewMember
      );

      // Optionally create Firebase Auth account if real email
      if (email && !email.includes('@company.com')) {
        try {
          // Generate a random password for the crew member
          const tempPassword = this.generateTempPassword();
          await createUserWithEmailAndPassword(auth, email, tempPassword);
          
          // TODO: Send password reset email
          console.log('[CrewMemberService] Auth account created for:', email);
        } catch (authError) {
          console.log('[CrewMemberService] Could not create auth account:', authError);
          // Continue anyway - auth account is optional
        }
      }

      return {
        ...crewMember,
        id: docRef.id,
      } as CrewMemberModel;
    } catch (error) {
      console.error('[CrewMemberService] Error creating crew member:', error);
      throw error;
    }
  }

  /**
   * Update an existing crew member
   */
  async updateCrewMember(
    crewMemberId: string,
    updates: Partial<CrewMemberModel>
  ): Promise<void> {
    try {
      const currentProfile = AuthService.getCurrentProfile();
      if (!currentProfile) {
        throw new Error('No authenticated user');
      }

      const companyId = currentProfile.companyId || '2XTSaqxU41zCTBIVJeXb';
      
      // Check permissions
      const isSiteAdmin = currentProfile.roles?.siteAdmin === true;
      const isAdmin = currentProfile.roles?.admin === true;

      if (!isSiteAdmin && !isAdmin) {
        throw new Error('Insufficient permissions to update crew members');
      }

      // If siteAdmin, verify they can edit this crew member
      if (isSiteAdmin && !isAdmin) {
        const crewMember = await this.getCrewMember(crewMemberId);
        const userSites = currentProfile.allocatedSiteIds || [];
        const hasAccess = crewMember.siteIds?.some(siteId => 
          userSites.includes(siteId)
        );
        
        if (!hasAccess) {
          throw new Error('Cannot edit crew members from other sites');
        }
      }

      await updateDoc(
        doc(db, this.getCollectionPath(companyId), crewMemberId),
        {
          ...updates,
          updatedAt: serverTimestamp(),
        }
      );
    } catch (error) {
      console.error('[CrewMemberService] Error updating crew member:', error);
      throw error;
    }
  }

  /**
   * Delete a crew member
   */
  async deleteCrewMember(crewMemberId: string): Promise<void> {
    try {
      const currentProfile = AuthService.getCurrentProfile();
      if (!currentProfile) {
        throw new Error('No authenticated user');
      }

      const companyId = currentProfile.companyId || '2XTSaqxU41zCTBIVJeXb';
      
      // Check permissions (same as update)
      const isSiteAdmin = currentProfile.roles?.siteAdmin === true;
      const isAdmin = currentProfile.roles?.admin === true;

      if (!isSiteAdmin && !isAdmin) {
        throw new Error('Insufficient permissions to delete crew members');
      }

      if (isSiteAdmin && !isAdmin) {
        const crewMember = await this.getCrewMember(crewMemberId);
        const userSites = currentProfile.allocatedSiteIds || [];
        const hasAccess = crewMember.siteIds?.some(siteId => 
          userSites.includes(siteId)
        );
        
        if (!hasAccess) {
          throw new Error('Cannot delete crew members from other sites');
        }
      }

      await deleteDoc(
        doc(db, this.getCollectionPath(companyId), crewMemberId)
      );
    } catch (error) {
      console.error('[CrewMemberService] Error deleting crew member:', error);
      throw error;
    }
  }

  /**
   * Get a single crew member
   */
  async getCrewMember(crewMemberId: string): Promise<CrewMemberModel> {
    try {
      const currentProfile = AuthService.getCurrentProfile();
      if (!currentProfile) {
        throw new Error('No authenticated user');
      }

      const companyId = currentProfile.companyId || '2XTSaqxU41zCTBIVJeXb';
      const docSnap = await getDoc(
        doc(db, this.getCollectionPath(companyId), crewMemberId)
      );

      if (!docSnap.exists()) {
        throw new Error('Crew member not found');
      }

      return {
        id: docSnap.id,
        ...docSnap.data(),
      } as CrewMemberModel;
    } catch (error) {
      console.error('[CrewMemberService] Error getting crew member:', error);
      throw error;
    }
  }

  /**
   * Get crew members with filters
   */
  async getCrewMembers(filters?: CrewMemberFilters): Promise<CrewMemberModel[]> {
    try {
      const currentProfile = AuthService.getCurrentProfile();
      if (!currentProfile) {
        throw new Error('No authenticated user');
      }

      const companyId = currentProfile.companyId || '2XTSaqxU41zCTBIVJeXb';
      const isSiteAdmin = currentProfile.roles?.siteAdmin === true;
      const isAdmin = currentProfile.roles?.admin === true;

      // Build query
      let q: Query<DocumentData> = collection(db, this.getCollectionPath(companyId));
      const constraints: any[] = [];

      // Site filtering
      if (isSiteAdmin && !isAdmin) {
        // SiteAdmin: only see crew from their sites
        const userSites = currentProfile.allocatedSiteIds || [];
        if (userSites.length > 0) {
          constraints.push(where('siteIds', 'array-contains-any', userSites));
        }
      } else if (filters?.siteId) {
        // Admin with specific site filter
        constraints.push(where('siteIds', 'array-contains', filters.siteId));
      }

      // Other filters
      if (filters?.position) {
        constraints.push(where('position', '==', filters.position));
      }

      if (filters?.isActive !== undefined) {
        constraints.push(where('isActive', '==', filters.isActive));
      }

      // Apply constraints and ordering
      constraints.push(orderBy('createdAt', 'desc'));
      q = query(q, ...constraints);

      const snapshot = await getDocs(q);
      let crewMembers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as CrewMemberModel[];

      // Client-side search filtering
      if (filters?.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        crewMembers = crewMembers.filter(member =>
          member.fullName?.toLowerCase().includes(searchLower) ||
          member.email?.toLowerCase().includes(searchLower) ||
          member.phoneNumber?.includes(filters.searchTerm) ||
          member.employeeNumber?.includes(filters.searchTerm)
        );
      }

      return crewMembers;
    } catch (error) {
      console.error('[CrewMemberService] Error getting crew members:', error);
      return [];
    }
  }

  /**
   * Get available positions
   */
  getAvailablePositions(): CrewPosition[] {
    return ['Supervisor', 'Site Manager', 'Quality Controller', 'Cleaner'];
  }

  /**
   * Generate a temporary password for crew members
   */
  private generateTempPassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  /**
   * Bulk import crew members
   */
  async bulkImportCrewMembers(
    crewMembers: Partial<CrewMemberModel>[],
    companyName: string = 'company'
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const member of crewMembers) {
      try {
        await this.createCrewMember(member, companyName);
        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(
          `Failed to import ${member.fullName}: ${error.message}`
        );
      }
    }

    return results;
  }
}

// Export as singleton
export default new CrewMemberService();