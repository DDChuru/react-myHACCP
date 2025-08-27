import { 
  collection, 
  doc,
  getDocs,
  getDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  Unsubscribe 
} from 'firebase/firestore';
import { db } from '../firebase';
import { SCIDocument, ImageFieldType } from '../types/sci';

// Firestore configuration
const COMPANY_ID = '2XTSaqxU41zCTBIVJeXb'; // Envirowize
const MCS_CATEGORY_ID = 'JX1ckleMoG3aOpOeaonO'; // Master Cleaning Schedule
const SCI_CATEGORY_ID = 'inxcJO4M5LI7sGZtOyl4'; // Standard Cleaning Instruction

export class SCIFirestoreService {
  private static instance: SCIFirestoreService;
  
  private constructor() {}
  
  static getInstance(): SCIFirestoreService {
    if (!SCIFirestoreService.instance) {
      SCIFirestoreService.instance = new SCIFirestoreService();
    }
    return SCIFirestoreService.instance;
  }

  /**
   * Fetch document categories for a company
   */
  async fetchDocumentCategories(companyId: string = COMPANY_ID): Promise<any[]> {
    try {
      const categoriesPath = `companies/${companyId}/documentCategories`;
      const querySnapshot = await getDocs(collection(db, categoriesPath));
      
      const categories: any[] = [];
      querySnapshot.forEach((doc) => {
        categories.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return categories;
    } catch (error) {
      console.error('Error fetching document categories:', error);
      return [];
    }
  }

  /**
   * Get the collection path for documents
   */
  private getDocumentsCollectionPath(companyId: string = COMPANY_ID): string {
    return `companies/${companyId}/documents`;
  }

  /**
   * Fetch all SCI documents for a company
   */
  async fetchSCIDocuments(companyId: string = COMPANY_ID): Promise<SCIDocument[]> {
    try {
      // First, let's check what categories exist
      const categoriesPath = `companies/${companyId}/documentCategories`;
      console.log('[Firestore] Fetching document categories from:', categoriesPath);
      const categoriesSnapshot = await getDocs(collection(db, categoriesPath));
      
      console.log('[Firestore] Available categories:');
      categoriesSnapshot.forEach((doc) => {
        const data = doc.data();
        console.log(`  - ${doc.id}: ${data.name || data.title || 'Unnamed'}`);
      });
      
      const collectionPath = this.getDocumentsCollectionPath(companyId);
      console.log('[Firestore] Querying path:', collectionPath);
      
      // First, let's see ALL documents and their categories
      console.log('[Firestore] Fetching ALL documents to analyze categories...');
      const allDocsSnapshot = await getDocs(collection(db, collectionPath));
      
      const categoryCounts: Record<string, number> = {};
      allDocsSnapshot.forEach((doc) => {
        const data = doc.data();
        const catId = data.categoryId || 'no-category';
        categoryCounts[catId] = (categoryCounts[catId] || 0) + 1;
      });
      
      console.log('[Firestore] Document distribution by category:');
      Object.entries(categoryCounts).forEach(([catId, count]) => {
        const label = catId === MCS_CATEGORY_ID ? 'MCS' : 
                     catId === SCI_CATEGORY_ID ? 'SCI?' : 
                     'Unknown';
        console.log(`  ${catId} (${label}): ${count} documents`);
      });
      
      // Now query for what we think is SCI
      console.log('[Firestore] Looking for categoryId:', SCI_CATEGORY_ID);
      
      // Let's try fetching ALL documents without filter first to see total count
      const allDocsQuery = collection(db, collectionPath);
      const allDocsSnap = await getDocs(allDocsQuery);
      console.log('[Firestore] Total documents in collection:', allDocsSnap.size);
      
      // Now filter for SCI
      const q = query(
        collection(db, collectionPath),
        where('categoryId', '==', SCI_CATEGORY_ID)
      );
      const querySnapshot = await getDocs(q);
      console.log('[Firestore] Query returned', querySnapshot.size, 'SCI documents');
      
      const documents: SCIDocument[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log(`[Firestore] Document ${doc.id}:`, {
          categoryId: data.categoryId,
          title: data.title,
          documentNumber: data.documentNumber,
          areas: data.areas?.slice(0, 2), // Just show first 2 areas
          contentKeys: Object.keys(data.content || {}),
          contentKeysFromDoc: data.contentKeys
        });
        
        // Log specific field values to see their structure
        if (data.content) {
          console.log('[Firestore] Checking field structures:');
          const keySanitationSteps = data.content['Key Cleaning/Sanitation Steps'] || 
                                     data.content['Key_Cleaning_Sanitation_Steps'];
          const postCleaningInspections = data.content['Post Cleaning Inspections'] || 
                                          data.content['Post_Cleaning_Inspections'];
          
          console.log('  - Key Cleaning/Sanitation Steps:', keySanitationSteps);
          console.log('  - Post Cleaning Inspections:', postCleaningInspections);
        }
        
        // Calculate image statistics
        const imageStats = this.calculateImageStats(data.content);
        
        // Transform Firestore data to our SCIDocument type
        // Handle the actual SCI document structure from Firestore
        const sciDoc: SCIDocument = {
          id: doc.id,
          documentNumber: data.documentNumber || `DOC-${doc.id.slice(0, 6)}`,
          title: data.title || 'Untitled Document',
          companyId: companyId,
          categoryId: data.categoryId || data.category_id || SCI_CATEGORY_ID,
          areas: data.areas || this.extractAreasFromContent(data.content),
          content: this.mapFirestoreContentToSCI(data.content, data.contentKeys),
          metadata: {
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt || new Date(),
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt || new Date(),
            createdBy: data.createdBy || 'system',
            version: data.version || '1.0',
            status: data.status || 'active',
          },
          imageStats: imageStats,
        };
        
        documents.push(sciDoc);
      });
      
      return documents;
    } catch (error) {
      console.error('Error fetching SCI documents:', error);
      throw error;
    }
  }

  /**
   * Fetch a single SCI document by ID
   */
  async fetchSCIDocument(documentId: string, companyId: string = COMPANY_ID): Promise<SCIDocument | null> {
    try {
      const docPath = `${this.getDocumentsCollectionPath(companyId)}/${documentId}`;
      const docSnap = await getDoc(doc(db, docPath));
      
      if (!docSnap.exists()) {
        return null;
      }
      
      const data = docSnap.data();
      const imageStats = this.calculateImageStats(data.content);
      
      const sciDoc: SCIDocument = {
        id: docSnap.id,
        documentNumber: data.documentNumber || `DOC-${docSnap.id.slice(0, 6)}`,
        title: data.title || 'Untitled Document',
        companyId: companyId,
        categoryId: SCI_CATEGORY_ID,
        areas: data.areas || this.extractAreasFromContent(data.content),
        content: this.mapFirestoreContentToSCI(data.content, data.contentKeys),
        metadata: {
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          createdBy: data.createdBy || 'system',
          version: data.version || '1.0',
          status: data.status || 'active',
        },
        imageStats: imageStats,
      };
      
      return sciDoc;
    } catch (error) {
      console.error('Error fetching SCI document:', error);
      throw error;
    }
  }

  /**
   * Subscribe to real-time updates for SCI documents
   */
  subscribeToSCIDocuments(
    callback: (documents: SCIDocument[]) => void,
    companyId: string = COMPANY_ID
  ): Unsubscribe {
    const collectionPath = this.getDocumentsCollectionPath(companyId);
    
    const q = query(
      collection(db, collectionPath),
      where('categoryId', '==', SCI_CATEGORY_ID)
    );
    
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const documents: SCIDocument[] = [];
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          const imageStats = this.calculateImageStats(data.content);
          
          const sciDoc: SCIDocument = {
            id: doc.id,
            documentNumber: data.documentNumber || `DOC-${doc.id.slice(0, 6)}`,
            title: data.title || 'Untitled Document',
            companyId: companyId,
            categoryId: SCI_CATEGORY_ID,
            areas: data.areas || this.extractAreasFromContent(data.content),
            content: this.mapFirestoreContentToSCI(data.content, data.contentKeys),
            metadata: {
              createdAt: data.createdAt?.toDate() || new Date(),
              updatedAt: data.updatedAt?.toDate() || new Date(),
              createdBy: data.createdBy || 'system',
              version: data.version || '1.0',
              status: data.status || 'active',
            },
            imageStats: imageStats,
          };
          
          documents.push(sciDoc);
        });
        
        callback(documents);
      },
      (error) => {
        console.error('Error in SCI documents subscription:', error);
      }
    );
    
    return unsubscribe;
  }

  /**
   * Update an image field in a document
   */
  async updateImageField(
    documentId: string,
    fieldType: ImageFieldType,
    fieldIndex: number,
    imageUrl: string,
    companyId: string = COMPANY_ID
  ): Promise<void> {
    try {
      const docPath = `${this.getDocumentsCollectionPath(companyId)}/${documentId}`;
      const fieldPath = this.mapFieldTypeToFirestorePath(fieldType);
      
      // Update the specific field item with the image URL
      const updateData = {
        [`content.${fieldPath}.${fieldIndex}.imageUrl`]: imageUrl,
        [`content.${fieldPath}.${fieldIndex}.image`]: imageUrl,
        updatedAt: new Date(),
      };
      
      await updateDoc(doc(db, docPath), updateData);
    } catch (error) {
      console.error('Error updating image field:', error);
      throw error;
    }
  }

  /**
   * Map our field types to Firestore field names
   */
  private mapFieldTypeToFirestorePath(fieldType: ImageFieldType): string {
    const mapping: Record<ImageFieldType, string> = {
      'sanitationSteps': 'key-sanitation-steps',
      'postCleaningInspections': 'post-cleaning-post-operation-inspection',
      'ppeRequirements': 'personal-protective-equipment-ppe',
      'safetyPrecautions': 'safety-precautions',
      'applicationEquipment': 'application-equipment',
    };
    
    return mapping[fieldType] || fieldType;
  }

  /**
   * Calculate image statistics for a document
   */
  private calculateImageStats(content: any): { total: number; captured: number; pending: number } {
    if (!content) {
      return { total: 0, captured: 0, pending: 0 };
    }

    let total = 0;
    let captured = 0;

    // Count fields that can have images - using actual Firestore field names
    const imageFields = [
      'Key Cleaning/Sanitation Steps',
      'Key_Cleaning_Sanitation_Steps',
      'sanitationSteps',
      'Post Cleaning Inspections',
      'Post_Cleaning_Inspections',
      'postCleaningInspections',
      'Personal Protective Equipment & other Safety Requirements',
      'Personal_Protective_Equipment_and_Safety_Requirements',
      'ppeRequirements',
      'Safety Precautions/Dismantling',
      'Safety_Precautions_Dismantling',
      'safetyPrecautions',
      'Application Equipment',
      'Application_Equipment',
      'applicationEquipment',
    ];

    imageFields.forEach(fieldName => {
      const field = content[fieldName];
      if (Array.isArray(field)) {
        total += field.length;
        field.forEach(item => {
          if (item.imageUrl || item.image) {
            // Check if it's a valid URL, not a placeholder
            const url = item.imageUrl || item.image;
            if (this.isValidImageUrl(url)) {
              captured++;
            }
          }
        });
      }
    });

    return {
      total,
      captured,
      pending: 0, // Will be calculated based on local queue
    };
  }

  /**
   * Check if a URL is valid (not a placeholder)
   */
  private isValidImageUrl(url: any): boolean {
    if (!url || typeof url !== 'string') return false;
    
    const placeholderTexts = ['photo placeholder', 'image placeholder', 'no image', 'add photo'];
    const lowerUrl = url.toLowerCase().trim();
    
    for (const placeholder of placeholderTexts) {
      if (lowerUrl.includes(placeholder)) return false;
    }
    
    return lowerUrl.startsWith('http://') || 
           lowerUrl.startsWith('https://') || 
           lowerUrl.startsWith('file://') ||
           lowerUrl.startsWith('gs://');
  }

  /**
   * Map Firestore content structure to our SCI format
   */
  private mapFirestoreContentToSCI(content: any, contentKeys?: string[]): any {
    if (!content) {
      console.log('[Firestore] No content to map');
      return {};
    }

    console.log('[Firestore] Mapping content with keys:', contentKeys);
    
    // Create a mapping of possible field name variations
    const fieldMappings: Record<string, string[]> = {
      'sanitationSteps': [
        'Key Cleaning/Sanitation Steps',
        'Key_Cleaning_Sanitation_Steps',
        'Key Cleaning Sanitation Steps',
        'Cleaning_Instructions',
        'Cleaning Instructions',
        'sanitationSteps'
      ],
      'postCleaningInspections': [
        'Post Cleaning Inspections',
        'Post_Cleaning_Inspections',
        'Post-Cleaning Inspections',
        'postCleaningInspections'
      ],
      'ppeRequirements': [
        'Personal Protective Equipment & other Safety Requirements',
        'Personal_Protective_Equipment_and_Safety_Requirements',
        'PPE Requirements',
        'ppeRequirements'
      ],
      'safetyPrecautions': [
        'Safety Precautions/Dismantling',
        'Safety_Precautions_Dismantling',
        'Safety Precautions',
        'safetyPrecautions'
      ],
      'applicationEquipment': [
        'Application Equipment',
        'Application_Equipment',
        'Equipment',
        'applicationEquipment'
      ],
      'cleaningChemicals': [
        'Cleaning Chemicals',
        'Cleaning_Chemicals',
        'Chemicals',
        'cleaningChemicals'
      ]
    };

    const mappedContent: any = {};
    
    // Try to map each field using the various possible names
    for (const [targetField, possibleNames] of Object.entries(fieldMappings)) {
      let foundValue = null;
      
      for (const possibleName of possibleNames) {
        if (content[possibleName]) {
          foundValue = content[possibleName];
          console.log(`[Firestore] Mapped "${possibleName}" to "${targetField}":`, 
                     Array.isArray(foundValue) ? `Array(${foundValue.length})` : typeof foundValue);
          break;
        }
      }
      
      // If we found a value, process it
      if (foundValue) {
        // If it's a string array, convert to object array
        if (Array.isArray(foundValue) && foundValue.length > 0) {
          if (typeof foundValue[0] === 'string') {
            mappedContent[targetField] = foundValue.map((item, index) => ({
              name: item,
              description: '',
              image: null
            }));
          } else {
            mappedContent[targetField] = foundValue;
          }
        } else {
          mappedContent[targetField] = foundValue;
        }
      } else {
        mappedContent[targetField] = [];
      }
    }
    
    console.log('[Firestore] Mapped content summary:', {
      sanitationSteps: mappedContent.sanitationSteps?.length || 0,
      postCleaningInspections: mappedContent.postCleaningInspections?.length || 0,
      ppeRequirements: mappedContent.ppeRequirements?.length || 0,
      safetyPrecautions: mappedContent.safetyPrecautions?.length || 0,
      applicationEquipment: mappedContent.applicationEquipment?.length || 0,
      cleaningChemicals: mappedContent.cleaningChemicals?.length || 0
    });
    
    return mappedContent;
  }

  /**
   * Update a specific field in a document with an image URL
   */
  async updateDocumentField(
    documentId: string,
    fieldType: string,
    fieldIndex: number,
    imageUrl: string,
    companyId: string = COMPANY_ID
  ): Promise<void> {
    try {
      console.log('[Firestore] Updating document field:', {
        documentId,
        fieldType,
        fieldIndex,
        imageUrl: imageUrl.substring(0, 50) + '...'
      });
      
      const docPath = `${this.getDocumentsCollectionPath(companyId)}/${documentId}`;
      const docRef = doc(db, docPath);
      
      // Get current document
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        throw new Error('Document not found');
      }
      
      const data = docSnap.data();
      const content = data.content || {};
      
      // Find the correct field name (handle variations)
      let actualFieldName = null;
      const fieldMappings: Record<string, string[]> = {
        'sanitationSteps': [
          'Key Cleaning/Sanitation Steps',
          'Key_Cleaning_Sanitation_Steps',
          'Cleaning Instructions'
        ],
        'postCleaningInspections': [
          'Post Cleaning Inspections',
          'Post_Cleaning_Inspections'
        ],
        'ppeRequirements': [
          'Personal Protective Equipment & other Safety Requirements'
        ],
        'safetyPrecautions': [
          'Safety Precautions/Dismantling'
        ],
        'applicationEquipment': [
          'Application Equipment',
          'Application_Equipment'
        ]
      };
      
      // Find the actual field name in the document
      const possibleNames = fieldMappings[fieldType] || [fieldType];
      for (const name of possibleNames) {
        if (content[name]) {
          actualFieldName = name;
          break;
        }
      }
      
      if (!actualFieldName) {
        console.error('[Firestore] Field not found in document:', fieldType);
        throw new Error(`Field ${fieldType} not found in document`);
      }
      
      console.log('[Firestore] Found field name:', actualFieldName);
      
      // Update the specific item in the array
      const fieldArray = content[actualFieldName];
      if (Array.isArray(fieldArray) && fieldArray[fieldIndex] !== undefined) {
        // Create updated content object
        const updatedContent = { ...content };
        
        // Update the specific item in the array
        if (typeof fieldArray[fieldIndex] === 'string') {
          // If it's a string, convert to object
          updatedContent[actualFieldName][fieldIndex] = {
            name: fieldArray[fieldIndex],
            image: imageUrl,
            imageUrl: imageUrl,
            imageUploadedAt: new Date().toISOString()
          };
        } else {
          // If it's already an object, update it
          updatedContent[actualFieldName][fieldIndex] = {
            ...fieldArray[fieldIndex],
            image: imageUrl,
            imageUrl: imageUrl,
            imageUploadedAt: new Date().toISOString()
          };
        }
        
        // Update the entire content object to avoid field path issues
        await updateDoc(docRef, {
          content: updatedContent,
          updatedAt: new Date()
        });
        
        console.log('[Firestore] Document field updated successfully');
      } else {
        throw new Error(`Invalid field index: ${fieldIndex}`);
      }
    } catch (error) {
      console.error('[Firestore] Failed to update document field:', error);
      throw error;
    }
  }

  /**
   * Extract areas from content (fallback if not defined)
   */
  private extractAreasFromContent(content: any): string[] {
    const areas = new Set<string>();
    
    // Look for area mentions in various fields
    if (content?.areas) {
      content.areas.forEach((area: string) => areas.add(area));
    }
    
    // Add some default areas based on content
    if (content?.['key-sanitation-steps']?.length > 0) {
      areas.add('Kitchen');
    }
    
    if (content?.['application-equipment']?.length > 0) {
      areas.add('Equipment Room');
    }
    
    if (areas.size === 0) {
      areas.add('General');
    }
    
    return Array.from(areas);
  }
}