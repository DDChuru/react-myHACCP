import { db, auth, storage } from '../firebase';
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
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
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
   * Upload crew member photo to Firebase Storage
   */
  async uploadCrewMemberPhoto(
    photoUri: string, 
    crewMemberId: string, 
    companyId: string
  ): Promise<string> {
    try {
      // Convert URI to blob
      const response = await fetch(photoUri);
      const blob = await response.blob();

      // Create storage reference
      const storageRef = ref(
        storage, 
        `companies/${companyId}/crewMembers/${crewMemberId}/photo.jpg`
      );

      // Upload the blob
      const snapshot = await uploadBytes(storageRef, blob);
      
      // Get the download URL
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      return downloadURL;
    } catch (error) {
      console.error('[CrewMemberService] Error uploading photo:', error);
      throw new Error('Failed to upload photo');
    }
  }

  /**
   * Delete crew member photo from Firebase Storage
   */
  async deleteCrewMemberPhoto(crewMemberId: string, companyId: string): Promise<void> {
    try {
      const storageRef = ref(
        storage, 
        `companies/${companyId}/crewMembers/${crewMemberId}/photo.jpg`
      );
      
      await deleteObject(storageRef);
    } catch (error) {
      // Photo might not exist, which is okay
      console.log('[CrewMemberService] Photo deletion failed (might not exist):', error);
    }
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

      // Store the local photo URI temporarily
      const localPhotoUri = data.photoUrl;
      
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
        photoUrl: undefined, // Don't save local URI yet
      };

      // Add to Firestore
      const docRef = await addDoc(
        collection(db, this.getCollectionPath(companyId)),
        crewMember
      );

      // Upload photo if provided
      let photoUrl: string | undefined = undefined;
      if (localPhotoUri && localPhotoUri.startsWith('file://')) {
        try {
          photoUrl = await this.uploadCrewMemberPhoto(localPhotoUri, docRef.id, companyId);
          
          // Update the document with the storage URL
          await updateDoc(
            doc(db, this.getCollectionPath(companyId), docRef.id),
            { photoUrl }
          );
        } catch (photoError) {
          console.error('[CrewMemberService] Photo upload failed, continuing without photo:', photoError);
        }
      }

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
        photoUrl: photoUrl || undefined,
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

      // Handle photo upload if a new local photo is provided
      let photoUrl = updates.photoUrl;
      if (photoUrl && photoUrl.startsWith('file://')) {
        try {
          // Upload new photo
          photoUrl = await this.uploadCrewMemberPhoto(photoUrl, crewMemberId, companyId);
        } catch (photoError) {
          console.error('[CrewMemberService] Photo upload failed during update:', photoError);
          photoUrl = undefined; // Don't update photo if upload fails
        }
      }

      // Prepare updates object
      const finalUpdates: any = {
        ...updates,
        updatedAt: serverTimestamp(),
      };

      // Only update photoUrl if we have a valid URL or explicitly want to remove it
      if (photoUrl !== undefined) {
        finalUpdates.photoUrl = photoUrl;
      } else if (updates.photoUrl === null) {
        // Allow explicit removal of photo
        finalUpdates.photoUrl = null;
      } else {
        // Don't update photoUrl field if no new photo
        delete finalUpdates.photoUrl;
      }

      await updateDoc(
        doc(db, this.getCollectionPath(companyId), crewMemberId),
        finalUpdates
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

      // Delete photo from storage if it exists
      try {
        await this.deleteCrewMemberPhoto(crewMemberId, companyId);
      } catch (error) {
        // Photo deletion failure shouldn't stop crew member deletion
        console.log('[CrewMemberService] Photo deletion failed, continuing with member deletion');
      }

      // Delete the crew member document
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