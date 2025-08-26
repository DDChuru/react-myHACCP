import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Image,
  TouchableOpacity,
  Text,
  Modal,
  TextInput,
  Dimensions,
  Alert,
  ScrollView,
} from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText, Rect, G, Polyline } from 'react-native-svg';
import ViewShot from 'react-native-view-shot';
import Slider from '@react-native-community/slider';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

type AnnotationType = 'circle' | 'arrow' | 'text' | 'rectangle' | 'freehand';
type AnnotationColor = '#FF0000' | '#FFFF00' | '#00FF00' | '#0000FF' | '#FF00FF' | '#000000' | '#FFFFFF';

interface Point {
  x: number;
  y: number;
}

interface Annotation {
  id: string;
  type: AnnotationType;
  color: AnnotationColor;
  strokeWidth: number;
  points: Point[];
  text?: string;
}

interface ImageAnnotatorProps {
  imageUri: string;
  onSave: (annotatedImageUri: string, annotations: Annotation[]) => void;
  onCancel: () => void;
  initialAnnotations?: Annotation[];
}

export default function ImageAnnotator({
  imageUri,
  onSave,
  onCancel,
  initialAnnotations = [],
}: ImageAnnotatorProps) {
  const [annotations, setAnnotations] = useState<Annotation[]>(initialAnnotations);
  const [currentTool, setCurrentTool] = useState<AnnotationType>('circle');
  const [currentColor, setCurrentColor] = useState<AnnotationColor>('#FF0000');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [textPosition, setTextPosition] = useState<Point>({ x: 0, y: 0 });
  const [viewDimensions, setViewDimensions] = useState({ width: 0, height: 0 });
  
  const viewShotRef = useRef<ViewShot>(null);
  const svgRef = useRef<any>(null);

  const colors: AnnotationColor[] = [
    '#FF0000', // Red
    '#FFFF00', // Yellow
    '#00FF00', // Green
    '#0000FF', // Blue
    '#FF00FF', // Magenta
    '#000000', // Black
    '#FFFFFF', // White
  ];

  useEffect(() => {
    console.log('[Annotator] Current annotations:', annotations.length);
    console.log('[Annotator] Is drawing:', isDrawing);
    console.log('[Annotator] Current points:', currentPoints.length);
  }, [annotations, isDrawing, currentPoints]);

  const handleTouchStart = (event: any) => {
    const { locationX, locationY } = event.nativeEvent;
    const point = { x: locationX, y: locationY };
    
    console.log('[Annotator] Touch start at:', point);
    
    if (currentTool === 'text') {
      setTextPosition(point);
      setShowTextInput(true);
    } else {
      setIsDrawing(true);
      setCurrentPoints([point]);
    }
  };

  const handleTouchMove = (event: any) => {
    if (!isDrawing || currentTool === 'text') return;
    
    const { locationX, locationY } = event.nativeEvent;
    const point = { x: locationX, y: locationY };
    
    if (currentTool === 'arrow') {
      // For arrow, only keep start and end points
      setCurrentPoints(prev => [prev[0], point]);
    } else if (currentTool === 'freehand') {
      // For freehand, add all points
      setCurrentPoints(prev => [...prev, point]);
    } else if (currentTool === 'circle' || currentTool === 'rectangle') {
      // For shapes, update the end point
      setCurrentPoints(prev => [prev[0], point]);
    }
  };

  const handleTouchEnd = () => {
    if (!isDrawing) return;
    
    console.log('[Annotator] Touch end, saving annotation');
    
    if (currentPoints.length > 0) {
      const newAnnotation: Annotation = {
        id: Date.now().toString(),
        type: currentTool,
        color: currentColor,
        strokeWidth,
        points: [...currentPoints], // Create a copy
      };
      
      console.log('[Annotator] Adding annotation:', newAnnotation);
      setAnnotations(prev => [...prev, newAnnotation]);
    }
    
    setIsDrawing(false);
    setCurrentPoints([]);
  };

  const handleTextSubmit = () => {
    if (textInput.trim()) {
      const newAnnotation: Annotation = {
        id: Date.now().toString(),
        type: 'text',
        color: currentColor,
        strokeWidth: 2,
        points: [textPosition],
        text: textInput,
      };
      
      setAnnotations(prev => [...prev, newAnnotation]);
    }
    
    setShowTextInput(false);
    setTextInput('');
  };

  const handleUndo = () => {
    if (annotations.length > 0) {
      setAnnotations(prev => prev.slice(0, -1));
    }
  };

  const handleClear = () => {
    Alert.alert(
      'Clear Annotations',
      'Are you sure you want to clear all annotations?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: () => setAnnotations([]) },
      ]
    );
  };

  const handleSave = async () => {
    try {
      if (viewShotRef.current) {
        const uri = await viewShotRef.current.capture();
        console.log('[Annotator] Captured annotated image:', uri);
        onSave(uri, annotations);
      }
    } catch (error) {
      console.error('[Annotator] Failed to capture:', error);
      Alert.alert('Error', 'Failed to save annotated image');
    }
  };

  const renderAnnotation = (annotation: Annotation, isPreview: boolean = false) => {
    const { type, color, strokeWidth: width, points, text, id } = annotation;
    const key = isPreview ? 'preview' : id;
    
    if (!points || points.length === 0) return null;
    
    switch (type) {
      case 'circle':
        if (points.length >= 2) {
          const radius = Math.sqrt(
            Math.pow(points[1].x - points[0].x, 2) +
            Math.pow(points[1].y - points[0].y, 2)
          );
          return (
            <Circle
              key={key}
              cx={points[0].x}
              cy={points[0].y}
              r={radius}
              stroke={color}
              strokeWidth={width}
              fill="none"
            />
          );
        }
        break;
        
      case 'arrow':
        if (points.length >= 2) {
          // Calculate arrow head points
          const dx = points[1].x - points[0].x;
          const dy = points[1].y - points[0].y;
          const angle = Math.atan2(dy, dx);
          const arrowLength = 15;
          const arrowAngle = Math.PI / 6;
          
          const x1 = points[1].x - arrowLength * Math.cos(angle - arrowAngle);
          const y1 = points[1].y - arrowLength * Math.sin(angle - arrowAngle);
          const x2 = points[1].x - arrowLength * Math.cos(angle + arrowAngle);
          const y2 = points[1].y - arrowLength * Math.sin(angle + arrowAngle);
          
          return (
            <G key={key}>
              <Line
                x1={points[0].x}
                y1={points[0].y}
                x2={points[1].x}
                y2={points[1].y}
                stroke={color}
                strokeWidth={width}
              />
              <Polyline
                points={`${x1},${y1} ${points[1].x},${points[1].y} ${x2},${y2}`}
                stroke={color}
                strokeWidth={width}
                fill="none"
              />
            </G>
          );
        }
        break;
        
      case 'rectangle':
        if (points.length >= 2) {
          const x = Math.min(points[0].x, points[1].x);
          const y = Math.min(points[0].y, points[1].y);
          const rectWidth = Math.abs(points[1].x - points[0].x);
          const rectHeight = Math.abs(points[1].y - points[0].y);
          
          return (
            <Rect
              key={key}
              x={x}
              y={y}
              width={rectWidth}
              height={rectHeight}
              stroke={color}
              strokeWidth={width}
              fill="none"
            />
          );
        }
        break;
        
      case 'freehand':
        if (points.length >= 2) {
          const pathData = points.reduce((path, point, index) => {
            if (index === 0) {
              return `M ${point.x} ${point.y}`;
            }
            return `${path} L ${point.x} ${point.y}`;
          }, '');
          
          return (
            <Path
              key={key}
              d={pathData}
              stroke={color}
              strokeWidth={width}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        }
        break;
        
      case 'text':
        if (points.length > 0 && text) {
          return (
            <SvgText
              key={key}
              x={points[0].x}
              y={points[0].y}
              fill={color}
              fontSize={16 + width * 2}
              fontWeight="bold"
            >
              {text}
            </SvgText>
          );
        }
        break;
    }
    
    return null;
  };

  return (
    <Modal visible={true} animationType="slide">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel} style={styles.headerButton}>
            <MaterialCommunityIcons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Annotate Image</Text>
          <TouchableOpacity onPress={handleSave} style={styles.headerButton}>
            <MaterialCommunityIcons name="check" size={24} color="#4CAF50" />
          </TouchableOpacity>
        </View>

        {/* Tools */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.toolsContainer}>
          <View style={styles.toolsRow}>
            {(['freehand', 'circle', 'arrow', 'rectangle', 'text'] as AnnotationType[]).map((tool) => (
              <TouchableOpacity
                key={tool}
                style={[
                  styles.toolButton,
                  currentTool === tool && styles.toolButtonActive,
                ]}
                onPress={() => setCurrentTool(tool)}
              >
                <MaterialCommunityIcons
                  name={
                    tool === 'freehand' ? 'draw' :
                    tool === 'circle' ? 'circle-outline' :
                    tool === 'arrow' ? 'arrow-top-right' :
                    tool === 'rectangle' ? 'rectangle-outline' :
                    'format-text'
                  }
                  size={24}
                  color={currentTool === tool ? '#FFF' : '#333'}
                />
                <Text style={[
                  styles.toolLabel,
                  { color: currentTool === tool ? '#FFF' : '#666' }
                ]}>
                  {tool.charAt(0).toUpperCase() + tool.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
            
            <View style={styles.divider} />
            
            <TouchableOpacity style={styles.toolButton} onPress={handleUndo}>
              <MaterialCommunityIcons name="undo" size={24} color="#333" />
              <Text style={styles.toolLabel}>Undo</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.toolButton} onPress={handleClear}>
              <MaterialCommunityIcons name="delete-outline" size={24} color="#333" />
              <Text style={styles.toolLabel}>Clear</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Color Picker */}
        <View style={styles.colorContainer}>
          <Text style={styles.label}>Color:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.colorRow}>
              {colors.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorButton,
                    { backgroundColor: color },
                    currentColor === color && styles.colorButtonActive,
                  ]}
                  onPress={() => setCurrentColor(color)}
                />
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Stroke Width */}
        <View style={styles.sliderContainer}>
          <Text style={styles.label}>Size: {strokeWidth}</Text>
          <Slider
            style={styles.slider}
            minimumValue={1}
            maximumValue={10}
            value={strokeWidth}
            onValueChange={(val) => setStrokeWidth(Math.round(val))}
            step={1}
            minimumTrackTintColor="#007AFF"
            maximumTrackTintColor="#CCC"
          />
        </View>

        {/* Canvas */}
        <View style={styles.canvasContainer}>
          <ViewShot ref={viewShotRef} style={styles.canvas}>
            <Image
              source={{ uri: imageUri }}
              style={styles.image}
              resizeMode="contain"
            />
            
            <View 
              style={StyleSheet.absoluteFillObject}
              onLayout={(e) => {
                const { width, height } = e.nativeEvent.layout;
                setViewDimensions({ width, height });
                console.log('[Annotator] Canvas dimensions:', { width, height });
              }}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <Svg 
                style={StyleSheet.absoluteFillObject}
                ref={svgRef}
              >
                {/* Render saved annotations */}
                {annotations.map(ann => renderAnnotation(ann, false))}
                
                {/* Render current drawing */}
                {isDrawing && currentPoints.length > 0 && renderAnnotation({
                  id: 'current',
                  type: currentTool,
                  color: currentColor,
                  strokeWidth,
                  points: currentPoints,
                }, true)}
              </Svg>
            </View>
          </ViewShot>
        </View>

        {/* Debug Info */}
        <View style={styles.debugInfo}>
          <Text style={styles.debugText}>
            Annotations: {annotations.length} | Drawing: {isDrawing ? 'Yes' : 'No'} | Points: {currentPoints.length}
          </Text>
        </View>

        {/* Text Input Modal */}
        <Modal visible={showTextInput} transparent animationType="fade">
          <View style={styles.textInputOverlay}>
            <View style={styles.textInputContainer}>
              <TextInput
                style={styles.textInput}
                value={textInput}
                onChangeText={setTextInput}
                placeholder="Enter text annotation"
                autoFocus
              />
              <View style={styles.textInputButtons}>
                <TouchableOpacity
                  style={styles.textButton}
                  onPress={() => setShowTextInput(false)}
                >
                  <Text style={styles.textButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.textButton, styles.textButtonPrimary]}
                  onPress={handleTextSubmit}
                >
                  <Text style={[styles.textButtonText, styles.textButtonTextPrimary]}>
                    Add
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  toolsContainer: {
    backgroundColor: '#FFF',
    maxHeight: 80,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  toolsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  toolButton: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 4,
    backgroundColor: '#F5F5F5',
  },
  toolButtonActive: {
    backgroundColor: '#007AFF',
  },
  toolLabel: {
    fontSize: 10,
    marginTop: 2,
    color: '#666',
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 8,
  },
  colorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFF',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginRight: 12,
    minWidth: 50,
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginHorizontal: 4,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  colorButtonActive: {
    borderColor: '#007AFF',
    borderWidth: 3,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  slider: {
    flex: 1,
    height: 40,
    marginLeft: 12,
  },
  canvasContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  canvas: {
    flex: 1,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  debugInfo: {
    backgroundColor: '#FFF',
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  debugText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  textInputOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textInputContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 300,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  textInputButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  textButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
    backgroundColor: '#F5F5F5',
  },
  textButtonPrimary: {
    backgroundColor: '#007AFF',
  },
  textButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  textButtonTextPrimary: {
    color: '#FFF',
  },
});