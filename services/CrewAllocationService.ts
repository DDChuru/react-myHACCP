import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
  writeBatch,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  CrewAreaAllocation,
  CrewAllocationSummary,
  AllocationFilters,
  BulkAllocationRequest,
  ICrewAllocationService,
  TrainingGap,
  TrainingProgressReport,
  AreaTrainingStatus,
  CrewTrainingStatus,
  SuggestedAllocation,
  AllocationDetail,
  TrainingDeadline,
  SiteArea,
  AreaItem
} from '../types/crewAllocation';
import { CrewMemberModel } from '../types/crewMember';

export class CrewAllocationService implements ICrewAllocationService {
  private companyId: string;
  private userId: string;

  constructor(companyId: string, userId: string) {
    this.companyId = companyId;
    this.userId = userId;
  }

  // ============================================================================
  // CRUD OPERATIONS
  // ============================================================================

  async createAllocation(allocation: Omit<CrewAreaAllocation, 'id'>): Promise<string> {
    try {
      const allocationsRef = collection(db, `companies/${this.companyId}/crewAllocations`);
      const newDocRef = doc(allocationsRef);
      
      const allocationData: CrewAreaAllocation = {
        ...allocation,
        id: newDocRef.id,
        companyId: this.companyId,
        createdBy: this.userId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        status: allocation.status || 'active',
        isTrainedForArea: allocation.isTrainedForArea || false,
        trainedAreaItems: allocation.trainedAreaItems || [],
        pendingTrainingItems: allocation.pendingTrainingItems || []
      };

      await setDoc(newDocRef, allocationData);
      
      // Update crew member's site assignment if this is a primary allocation
      if (allocation.assignmentType === 'primary') {
        await this.updateCrewMemberSiteAssignment(allocation.crewMemberId, allocation.siteId);
      }

      return newDocRef.id;
    } catch (error) {
      console.error('[CrewAllocationService] Error creating allocation:', error);
      throw error;
    }
  }

  async updateAllocation(id: string, updates: Partial<CrewAreaAllocation>): Promise<void> {
    try {
      const allocationRef = doc(db, `companies/${this.companyId}/crewAllocations`, id);
      
      await updateDoc(allocationRef, {
        ...updates,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('[CrewAllocationService] Error updating allocation:', error);
      throw error;
    }
  }

  async deleteAllocation(id: string): Promise<void> {
    try {
      const allocationRef = doc(db, `companies/${this.companyId}/crewAllocations`, id);
      await deleteDoc(allocationRef);
    } catch (error) {
      console.error('[CrewAllocationService] Error deleting allocation:', error);
      throw error;
    }
  }

  async getAllocation(id: string): Promise<CrewAreaAllocation | null> {
    try {
      const allocationRef = doc(db, `companies/${this.companyId}/crewAllocations`, id);
      const snapshot = await getDoc(allocationRef);
      
      if (!snapshot.exists()) {
        return null;
      }

      return snapshot.data() as CrewAreaAllocation;
    } catch (error) {
      console.error('[CrewAllocationService] Error getting allocation:', error);
      return null;
    }
  }

  // ============================================================================
  // QUERY OPERATIONS
  // ============================================================================

  async getAllocations(filters: AllocationFilters): Promise<CrewAreaAllocation[]> {
    try {
      const allocationsRef = collection(db, `companies/${this.companyId}/crewAllocations`);
      let q = query(allocationsRef);

      // Apply filters
      if (filters.siteId) {
        q = query(q, where('siteId', '==', filters.siteId));
      }
      if (filters.areaId) {
        q = query(q, where('areaId', '==', filters.areaId));
      }
      if (filters.crewMemberId) {
        q = query(q, where('crewMemberId', '==', filters.crewMemberId));
      }
      if (filters.assignmentType) {
        q = query(q, where('assignmentType', '==', filters.assignmentType));
      }
      if (filters.status) {
        q = query(q, where('status', '==', filters.status));
      }
      if (filters.shift) {
        q = query(q, where('shift', '==', filters.shift));
      }

      const snapshot = await getDocs(q);
      let allocations = snapshot.docs.map(doc => doc.data() as CrewAreaAllocation);

      // Apply client-side filters
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        allocations = allocations.filter(a => 
          a.crewMemberName.toLowerCase().includes(searchLower) ||
          a.areaName.toLowerCase().includes(searchLower)
        );
      }

      if (filters.trainingStatus) {
        allocations = allocations.filter(a => {
          if (filters.trainingStatus === 'trained') {
            return a.isTrainedForArea;
          } else if (filters.trainingStatus === 'untrained') {
            return !a.isTrainedForArea;
          } else if (filters.trainingStatus === 'partial') {
            return a.trainedAreaItems && a.trainedAreaItems.length > 0 && 
                   a.pendingTrainingItems && a.pendingTrainingItems.length > 0;
          }
          return true;
        });
      }

      return allocations;
    } catch (error) {
      console.error('[CrewAllocationService] Error getting allocations:', error);
      return [];
    }
  }

  async getCrewSummary(crewMemberId: string): Promise<CrewAllocationSummary> {
    try {
      // Get crew member details
      const crewRef = doc(db, `companies/${this.companyId}/crewMembers`, crewMemberId);
      const crewSnapshot = await getDoc(crewRef);
      const crewData = crewSnapshot.data() as CrewMemberModel;

      // Get all allocations for this crew member
      const allocations = await this.getAllocations({ crewMemberId });

      // Categorize allocations
      const primaryAreas: AllocationDetail[] = [];
      const secondaryAreas: AllocationDetail[] = [];
      const backupAreas: AllocationDetail[] = [];

      let totalVerifications = 0;
      let successfulVerifications = 0;
      let totalCompetencyScore = 0;
      let competencyCount = 0;
      let totalAreaItems = 0;
      let trainedItemsCount = 0;

      for (const allocation of allocations) {
        const detail: AllocationDetail = {
          areaId: allocation.areaId,
          areaName: allocation.areaName,
          assignmentType: allocation.assignmentType,
          trainingStatus: this.getTrainingStatus(allocation),
          competencyScore: allocation.competencyScore,
          itemsTrainingProgress: {
            total: (allocation.assignedAreaItemsCount || 0),
            trained: (allocation.trainedAreaItems?.length || 0),
            percentage: allocation.assignedAreaItemsCount 
              ? ((allocation.trainedAreaItems?.length || 0) / allocation.assignedAreaItemsCount) * 100
              : 0
          }
        };

        // Categorize by assignment type
        switch (allocation.assignmentType) {
          case 'primary':
            primaryAreas.push(detail);
            break;
          case 'secondary':
            secondaryAreas.push(detail);
            break;
          case 'backup':
            backupAreas.push(detail);
            break;
        }

        // Aggregate metrics
        totalVerifications += allocation.completedVerificationsCount || 0;
        successfulVerifications += (allocation.completedVerificationsCount || 0) - (allocation.failedVerificationsCount || 0);
        
        if (allocation.competencyScore !== undefined) {
          totalCompetencyScore += allocation.competencyScore;
          competencyCount++;
        }

        totalAreaItems += allocation.assignedAreaItemsCount || 0;
        trainedItemsCount += allocation.trainedAreaItems?.length || 0;
      }

      // Calculate training summaries
      const fullyTrainedAreas = allocations.filter(a => a.isTrainedForArea).length;
      const partiallyTrainedAreas = allocations.filter(a => 
        !a.isTrainedForArea && a.trainedAreaItems && a.trainedAreaItems.length > 0
      ).length;
      const pendingTrainingAreas = allocations.filter(a => 
        !a.trainedAreaItems || a.trainedAreaItems.length === 0
      ).length;

      // Get upcoming training deadlines
      const upcomingDeadlines = await this.getUpcomingTrainingDeadlines(crewMemberId);

      return {
        crewMemberId,
        crewMemberName: crewData?.fullName || '',
        position: crewData?.position,
        photoUrl: crewData?.photoUrl,
        primaryAreas,
        secondaryAreas,
        backupAreas,
        totalAreasAssigned: allocations.length,
        fullyTrainedAreas,
        partiallyTrainedAreas,
        pendingTrainingAreas,
        overallCompetencyScore: competencyCount > 0 ? totalCompetencyScore / competencyCount : 0,
        totalVerifications,
        successRate: totalVerifications > 0 ? (successfulVerifications / totalVerifications) * 100 : 0,
        totalAreaItems,
        trainedItemsCount,
        trainingCompletionRate: totalAreaItems > 0 ? (trainedItemsCount / totalAreaItems) * 100 : 0,
        upcomingTrainingDeadlines: upcomingDeadlines
      };
    } catch (error) {
      console.error('[CrewAllocationService] Error getting crew summary:', error);
      throw error;
    }
  }

  async getAreaCoverage(areaId: string): Promise<AreaTrainingStatus> {
    try {
      // Get area details
      const areaRef = doc(db, `companies/${this.companyId}/siteAreas`, areaId);
      const areaSnapshot = await getDoc(areaRef);
      const areaData = areaSnapshot.data() as SiteArea;

      // Get all allocations for this area
      const allocations = await this.getAllocations({ areaId, status: 'active' });

      // Get area items
      const areaItemsRef = collection(db, `companies/${this.companyId}/areaItems`);
      const itemsQuery = query(areaItemsRef, where('areaId', '==', areaId));
      const itemsSnapshot = await getDocs(itemsQuery);
      const areaItems = itemsSnapshot.docs.map(doc => doc.data() as AreaItem);

      const criticalItems = areaItems.filter(item => item.isCritical).length;
      const fullyTrainedCrew = allocations.filter(a => a.isTrainedForArea).length;

      // Check shift coverage
      const shifts = {
        morning: allocations.some(a => a.shift === 'morning'),
        afternoon: allocations.some(a => a.shift === 'afternoon'),
        night: allocations.some(a => a.shift === 'night')
      };

      return {
        areaId,
        areaName: areaData?.areaName || '',
        totalItems: areaItems.length,
        criticalItems,
        assignedCrew: allocations.length,
        fullyTrainedCrew,
        coveragePercentage: allocations.length > 0 ? (fullyTrainedCrew / allocations.length) * 100 : 0,
        shifts
      };
    } catch (error) {
      console.error('[CrewAllocationService] Error getting area coverage:', error);
      throw error;
    }
  }

  // ============================================================================
  // BULK OPERATIONS
  // ============================================================================

  async bulkAllocate(request: BulkAllocationRequest): Promise<string[]> {
    try {
      const batch = writeBatch(db);
      const allocationIds: string[] = [];

      for (const crewMemberId of request.crewMemberIds) {
        // Get crew member details
        const crewRef = doc(db, `companies/${this.companyId}/crewMembers`, crewMemberId);
        const crewSnapshot = await getDoc(crewRef);
        const crewData = crewSnapshot.data() as CrewMemberModel;

        for (const areaId of request.areaIds) {
          // Get area details
          const areaRef = doc(db, `companies/${this.companyId}/siteAreas`, areaId);
          const areaSnapshot = await getDoc(areaRef);
          const areaData = areaSnapshot.data() as SiteArea;

          // Create allocation
          const allocationsRef = collection(db, `companies/${this.companyId}/crewAllocations`);
          const newDocRef = doc(allocationsRef);
          
          const allocationData: CrewAreaAllocation = {
            id: newDocRef.id,
            crewMemberId,
            crewMemberName: crewData?.fullName || '',
            areaId,
            areaName: areaData?.areaName || '',
            siteId: areaData?.siteId || '',
            companyId: this.companyId,
            assignmentType: request.assignmentType,
            startDate: Timestamp.fromDate(request.startDate),
            endDate: request.endDate ? Timestamp.fromDate(request.endDate) : undefined,
            shift: request.shift,
            workDays: request.workDays,
            isTrainedForArea: false,
            trainedAreaItems: [],
            pendingTrainingItems: [],
            status: 'active',
            notes: request.notes,
            createdBy: this.userId,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
          };

          batch.set(newDocRef, allocationData);
          allocationIds.push(newDocRef.id);
        }
      }

      await batch.commit();
      return allocationIds;
    } catch (error) {
      console.error('[CrewAllocationService] Error bulk allocating:', error);
      throw error;
    }
  }

  async bulkUpdateTrainingStatus(allocationIds: string[], itemIds: string[]): Promise<void> {
    try {
      const batch = writeBatch(db);

      for (const allocationId of allocationIds) {
        const allocationRef = doc(db, `companies/${this.companyId}/crewAllocations`, allocationId);
        const allocationSnapshot = await getDoc(allocationRef);
        const allocation = allocationSnapshot.data() as CrewAreaAllocation;

        if (allocation) {
          const updatedTrainedItems = [...new Set([...(allocation.trainedAreaItems || []), ...itemIds])];
          const updatedPendingItems = (allocation.pendingTrainingItems || []).filter(id => !itemIds.includes(id));

          batch.update(allocationRef, {
            trainedAreaItems: updatedTrainedItems,
            pendingTrainingItems: updatedPendingItems,
            updatedAt: Timestamp.now()
          });
        }
      }

      await batch.commit();
    } catch (error) {
      console.error('[CrewAllocationService] Error bulk updating training status:', error);
      throw error;
    }
  }

  // ============================================================================
  // TRAINING OPERATIONS
  // ============================================================================

  async recordTrainingCompletion(allocationId: string, itemIds: string[]): Promise<void> {
    try {
      const allocationRef = doc(db, `companies/${this.companyId}/crewAllocations`, allocationId);
      const allocationSnapshot = await getDoc(allocationRef);
      const allocation = allocationSnapshot.data() as CrewAreaAllocation;

      if (!allocation) {
        throw new Error('Allocation not found');
      }

      const updatedTrainedItems = [...new Set([...(allocation.trainedAreaItems || []), ...itemIds])];
      const updatedPendingItems = (allocation.pendingTrainingItems || []).filter(id => !itemIds.includes(id));

      // Check if fully trained for area
      const areaItemsRef = collection(db, `companies/${this.companyId}/areaItems`);
      const itemsQuery = query(areaItemsRef, where('areaId', '==', allocation.areaId));
      const itemsSnapshot = await getDocs(itemsQuery);
      const totalAreaItems = itemsSnapshot.size;

      const isFullyTrained = updatedTrainedItems.length === totalAreaItems;

      await updateDoc(allocationRef, {
        trainedAreaItems: updatedTrainedItems,
        pendingTrainingItems: updatedPendingItems,
        isTrainedForArea: isFullyTrained,
        trainingCompletedDate: isFullyTrained ? Timestamp.now() : null,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('[CrewAllocationService] Error recording training completion:', error);
      throw error;
    }
  }

  async getTrainingGaps(siteId: string): Promise<TrainingGap[]> {
    try {
      const gaps: TrainingGap[] = [];

      // Get all areas for the site
      const areasRef = collection(db, `companies/${this.companyId}/siteAreas`);
      const areasQuery = query(areasRef, where('siteId', '==', siteId));
      const areasSnapshot = await getDocs(areasQuery);

      for (const areaDoc of areasSnapshot.docs) {
        const area = areaDoc.data() as SiteArea;
        
        // Get allocations for this area
        const allocations = await this.getAllocations({ 
          areaId: area.id, 
          status: 'active' 
        });

        // Check for coverage gaps
        if (allocations.length === 0) {
          gaps.push({
            areaId: area.id,
            areaName: area.areaName,
            gapType: 'no_coverage',
            severity: 'critical',
            affectedShifts: ['morning', 'afternoon', 'night'],
            recommendedAction: 'Assign crew members to this area immediately'
          });
          continue;
        }

        // Check for training gaps
        const trainedAllocations = allocations.filter(a => a.isTrainedForArea);
        if (trainedAllocations.length === 0) {
          gaps.push({
            areaId: area.id,
            areaName: area.areaName,
            gapType: 'insufficient_trained',
            severity: 'high',
            affectedShifts: this.getUncoveredShifts(allocations),
            recommendedAction: 'Schedule training for assigned crew members'
          });
        }

        // Check for expiring certifications
        const expiringCerts = allocations.filter(a => {
          if (a.certificationExpiryDate) {
            const expiryDate = a.certificationExpiryDate instanceof Timestamp 
              ? a.certificationExpiryDate.toDate() 
              : new Date(a.certificationExpiryDate);
            const daysUntilExpiry = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            return daysUntilExpiry <= 30;
          }
          return false;
        });

        if (expiringCerts.length > 0) {
          gaps.push({
            areaId: area.id,
            areaName: area.areaName,
            gapType: 'expiring_certification',
            severity: 'medium',
            affectedShifts: this.getAffectedShifts(expiringCerts),
            recommendedAction: `Renew certifications for ${expiringCerts.length} crew members`
          });
        }
      }

      return gaps;
    } catch (error) {
      console.error('[CrewAllocationService] Error getting training gaps:', error);
      return [];
    }
  }

  async generateTrainingReport(siteId: string): Promise<TrainingProgressReport> {
    try {
      // Get site details
      const sitesRef = collection(db, `companies/${this.companyId}/sites`);
      const siteQuery = query(sitesRef, where('id', '==', siteId));
      const siteSnapshot = await getDocs(siteQuery);
      const siteData = siteSnapshot.docs[0]?.data();

      // Get all areas for the site
      const areasRef = collection(db, `companies/${this.companyId}/siteAreas`);
      const areasQuery = query(areasRef, where('siteId', '==', siteId));
      const areasSnapshot = await getDocs(areasQuery);
      const areas = areasSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as SiteArea));

      // Get all crew members
      const crewRef = collection(db, `companies/${this.companyId}/crewMembers`);
      const crewQuery = query(crewRef, where('siteIds', 'array-contains', siteId));
      const crewSnapshot = await getDocs(crewQuery);
      const crewMembers = crewSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as CrewMemberModel));

      // Get all allocations for the site
      const allocations = await this.getAllocations({ siteId, status: 'active' });

      // Get all area items
      let totalAreaItems = 0;
      let criticalItemsWithTrainedCrew = 0;
      let criticalItemsWithoutTrainedCrew = 0;

      const byArea: AreaTrainingStatus[] = [];
      
      for (const area of areas) {
        const areaAllocations = allocations.filter(a => a.areaId === area.id);
        const areaCoverage = await this.getAreaCoverage(area.id);
        byArea.push(areaCoverage);
        
        totalAreaItems += areaCoverage.totalItems;
        
        // Check critical items coverage
        if (areaCoverage.criticalItems > 0) {
          if (areaCoverage.fullyTrainedCrew > 0) {
            criticalItemsWithTrainedCrew += areaCoverage.criticalItems;
          } else {
            criticalItemsWithoutTrainedCrew += areaCoverage.criticalItems;
          }
        }
      }

      // Generate crew training status
      const byCrew: CrewTrainingStatus[] = [];
      
      for (const crew of crewMembers) {
        const crewAllocations = allocations.filter(a => a.crewMemberId === crew.id);
        const summary = await this.getCrewSummary(crew.id);
        
        byCrew.push({
          crewMemberId: crew.id,
          crewMemberName: crew.fullName,
          position: crew.position || '',
          areasAssigned: crewAllocations.length,
          areasFullyTrained: summary.fullyTrainedAreas,
          itemsTrained: summary.trainedItemsCount,
          trainingCompletionRate: summary.trainingCompletionRate,
          upcomingDeadlines: summary.upcomingTrainingDeadlines.length
        });
      }

      // Calculate overall metrics
      const fullyTrainedAllocations = allocations.filter(a => a.isTrainedForArea).length;
      const partiallyTrainedAllocations = allocations.filter(a => 
        !a.isTrainedForArea && a.trainedAreaItems && a.trainedAreaItems.length > 0
      ).length;
      const untrainedAllocations = allocations.filter(a => 
        !a.trainedAreaItems || a.trainedAreaItems.length === 0
      ).length;

      // Calculate area coverage
      const areasWithFullCoverage = areas.filter(area => {
        const areaAllocations = allocations.filter(a => a.areaId === area.id && a.isTrainedForArea);
        return areaAllocations.length >= 3; // At least one per shift
      }).length;

      const areasWithPartialCoverage = areas.filter(area => {
        const areaAllocations = allocations.filter(a => a.areaId === area.id);
        return areaAllocations.length > 0 && areaAllocations.length < 3;
      }).length;

      const areasWithNoCoverage = areas.filter(area => {
        const areaAllocations = allocations.filter(a => a.areaId === area.id);
        return areaAllocations.length === 0;
      }).length;

      // Get training gaps and suggestions
      const trainingGaps = await this.getTrainingGaps(siteId);
      const suggestedAllocations: SuggestedAllocation[] = [];

      // Generate suggestions for areas with gaps
      for (const gap of trainingGaps) {
        if (gap.gapType === 'no_coverage') {
          const suggestions = await this.suggestAllocations(gap.areaId);
          suggestedAllocations.push(...suggestions);
        }
      }

      return {
        reportDate: new Date(),
        siteId,
        siteName: siteData?.name || '',
        totalCrewMembers: crewMembers.length,
        totalAreas: areas.length,
        totalAreaItems,
        totalAllocations: allocations.length,
        fullyTrainedAllocations,
        partiallyTrainedAllocations,
        untrainedAllocations,
        areasWithFullCoverage,
        areasWithPartialCoverage,
        areasWithNoCoverage,
        criticalItemsWithTrainedCrew,
        criticalItemsWithoutTrainedCrew,
        byArea,
        byCrew,
        trainingGaps,
        suggestedAllocations
      };
    } catch (error) {
      console.error('[CrewAllocationService] Error generating training report:', error);
      throw error;
    }
  }

  // ============================================================================
  // RECOMMENDATIONS
  // ============================================================================

  async suggestAllocations(areaId: string): Promise<SuggestedAllocation[]> {
    try {
      const suggestions: SuggestedAllocation[] = [];

      // Get area details
      const areaRef = doc(db, `companies/${this.companyId}/siteAreas`, areaId);
      const areaSnapshot = await getDoc(areaRef);
      const areaData = areaSnapshot.data() as SiteArea;

      if (!areaData) return [];

      // Get existing allocations for this area
      const existingAllocations = await this.getAllocations({ areaId });
      const assignedCrewIds = existingAllocations.map(a => a.crewMemberId);

      // Get all crew members for the site
      const crewRef = collection(db, `companies/${this.companyId}/crewMembers`);
      const crewQuery = query(
        crewRef, 
        where('siteIds', 'array-contains', areaData.siteId),
        where('isActive', '==', true)
      );
      const crewSnapshot = await getDocs(crewQuery);
      
      // Evaluate each crew member
      for (const crewDoc of crewSnapshot.docs) {
        const crew = crewDoc.data() as CrewMemberModel;
        
        // Skip if already assigned
        if (assignedCrewIds.includes(crew.id)) continue;

        // Calculate match score
        let matchScore = 50; // Base score
        let reasons: string[] = [];

        // Check if crew has experience in similar areas
        const crewAllocations = await this.getAllocations({ crewMemberId: crew.id });
        const hasExperience = crewAllocations.some(a => a.isTrainedForArea);
        
        if (hasExperience) {
          matchScore += 20;
          reasons.push('Has experience in other areas');
        }

        // Check position suitability
        if (crew.position === 'Supervisor' || crew.position === 'Quality Controller') {
          matchScore += 15;
          reasons.push(`${crew.position} role is suitable for this area`);
        }

        // Check availability (fewer current allocations = higher score)
        if (crewAllocations.length < 3) {
          matchScore += 15;
          reasons.push('Has capacity for additional areas');
        }

        // Get required training items
        const areaItemsRef = collection(db, `companies/${this.companyId}/areaItems`);
        const itemsQuery = query(
          areaItemsRef, 
          where('areaId', '==', areaId),
          where('requiresTraining', '==', true)
        );
        const itemsSnapshot = await getDocs(itemsQuery);
        const requiredTraining = itemsSnapshot.docs.map(doc => doc.data().itemName);

        suggestions.push({
          crewMemberId: crew.id,
          crewMemberName: crew.fullName,
          areaId,
          areaName: areaData.areaName,
          reason: reasons.join(', '),
          matchScore,
          requiredTraining
        });
      }

      // Sort by match score
      suggestions.sort((a, b) => b.matchScore - a.matchScore);
      
      // Return top 5 suggestions
      return suggestions.slice(0, 5);
    } catch (error) {
      console.error('[CrewAllocationService] Error suggesting allocations:', error);
      return [];
    }
  }

  async optimizeShiftCoverage(siteId: string): Promise<BulkAllocationRequest[]> {
    try {
      const optimizationRequests: BulkAllocationRequest[] = [];

      // Get all areas for the site
      const areasRef = collection(db, `companies/${this.companyId}/siteAreas`);
      const areasQuery = query(areasRef, where('siteId', '==', siteId));
      const areasSnapshot = await getDocs(areasQuery);

      for (const areaDoc of areasSnapshot.docs) {
        const area = areaDoc.data() as SiteArea;
        
        // Get current allocations
        const allocations = await this.getAllocations({ 
          areaId: area.id, 
          status: 'active' 
        });

        // Check shift coverage
        const morningCrew = allocations.filter(a => a.shift === 'morning');
        const afternoonCrew = allocations.filter(a => a.shift === 'afternoon');
        const nightCrew = allocations.filter(a => a.shift === 'night');

        // Identify gaps and create optimization requests
        if (morningCrew.length === 0) {
          const suggestions = await this.suggestAllocations(area.id);
          if (suggestions.length > 0) {
            optimizationRequests.push({
              crewMemberIds: [suggestions[0].crewMemberId],
              areaIds: [area.id],
              assignmentType: 'primary',
              startDate: new Date(),
              shift: 'morning',
              workDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
            });
          }
        }

        if (afternoonCrew.length === 0) {
          const suggestions = await this.suggestAllocations(area.id);
          if (suggestions.length > 1) {
            optimizationRequests.push({
              crewMemberIds: [suggestions[1].crewMemberId],
              areaIds: [area.id],
              assignmentType: 'primary',
              startDate: new Date(),
              shift: 'afternoon',
              workDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
            });
          }
        }
      }

      return optimizationRequests;
    } catch (error) {
      console.error('[CrewAllocationService] Error optimizing shift coverage:', error);
      return [];
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private getTrainingStatus(allocation: CrewAreaAllocation): 'completed' | 'in_progress' | 'pending' {
    if (allocation.isTrainedForArea) {
      return 'completed';
    } else if (allocation.trainedAreaItems && allocation.trainedAreaItems.length > 0) {
      return 'in_progress';
    }
    return 'pending';
  }

  private getUncoveredShifts(allocations: CrewAreaAllocation[]): string[] {
    const coveredShifts = new Set(allocations.map(a => a.shift).filter(Boolean));
    const allShifts = ['morning', 'afternoon', 'night'];
    return allShifts.filter(shift => !coveredShifts.has(shift));
  }

  private getAffectedShifts(allocations: CrewAreaAllocation[]): string[] {
    return [...new Set(allocations.map(a => a.shift).filter(Boolean))] as string[];
  }

  private async updateCrewMemberSiteAssignment(crewMemberId: string, siteId: string): Promise<void> {
    try {
      const crewRef = doc(db, `companies/${this.companyId}/crewMembers`, crewMemberId);
      const crewSnapshot = await getDoc(crewRef);
      const crewData = crewSnapshot.data() as CrewMemberModel;

      if (crewData) {
        const updatedSiteIds = [...new Set([...(crewData.siteIds || []), siteId])];
        await updateDoc(crewRef, {
          siteIds: updatedSiteIds,
          primarySiteId: crewData.primarySiteId || siteId,
          updatedAt: Timestamp.now()
        });
      }
    } catch (error) {
      console.error('[CrewAllocationService] Error updating crew site assignment:', error);
    }
  }

  private async getUpcomingTrainingDeadlines(crewMemberId: string): Promise<TrainingDeadline[]> {
    const deadlines: TrainingDeadline[] = [];
    
    try {
      const allocations = await this.getAllocations({ crewMemberId, status: 'active' });
      
      for (const allocation of allocations) {
        // Check certification expiry
        if (allocation.certificationExpiryDate) {
          const expiryDate = allocation.certificationExpiryDate instanceof Timestamp 
            ? allocation.certificationExpiryDate.toDate() 
            : new Date(allocation.certificationExpiryDate);
          
          const daysUntilExpiry = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          
          if (daysUntilExpiry <= 90) {
            deadlines.push({
              areaId: allocation.areaId,
              areaName: allocation.areaName,
              deadline: expiryDate,
              type: 'certification_expiry',
              priority: daysUntilExpiry <= 30 ? 'high' : 'medium'
            });
          }
        }

        // Check pending training items
        if (allocation.pendingTrainingItems && allocation.pendingTrainingItems.length > 0) {
          // Set a default deadline of 30 days for pending training
          const trainingDeadline = new Date();
          trainingDeadline.setDate(trainingDeadline.getDate() + 30);
          
          deadlines.push({
            areaId: allocation.areaId,
            areaName: allocation.areaName,
            deadline: trainingDeadline,
            type: 'mandatory_training',
            priority: 'medium'
          });
        }
      }
      
      // Sort by deadline
      deadlines.sort((a, b) => {
        const dateA = a.deadline instanceof Timestamp ? a.deadline.toDate() : new Date(a.deadline);
        const dateB = b.deadline instanceof Timestamp ? b.deadline.toDate() : new Date(b.deadline);
        return dateA.getTime() - dateB.getTime();
      });
      
      return deadlines.slice(0, 5); // Return top 5 upcoming deadlines
    } catch (error) {
      console.error('[CrewAllocationService] Error getting training deadlines:', error);
      return [];
    }
  }
}