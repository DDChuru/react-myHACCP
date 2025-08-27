import React, { useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Alert,
  Dimensions,
} from 'react-native';
import {
  Surface,
  Text,
  Button,
  useTheme,
  Portal,
  IconButton,
} from 'react-native-paper';
import SignatureCanvas from 'react-native-signature-canvas';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface SignatureCaptureProps {
  visible: boolean;
  onDismiss: () => void;
  onSave: (signature: string) => void;
  title?: string;
  description?: string;
  existingSignature?: string;
}

export default function SignatureCapture({
  visible,
  onDismiss,
  onSave,
  title = 'Signature Required',
  description = 'Please sign below',
  existingSignature,
}: SignatureCaptureProps) {
  const theme = useTheme();
  const signatureRef = useRef<any>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  const handleSave = () => {
    if (isEmpty && !existingSignature) {
      Alert.alert('Signature Required', 'Please provide your signature');
      return;
    }
    
    if (existingSignature && isEmpty) {
      // User didn't draw new signature, use existing
      onSave(existingSignature);
      handleClear();
      onDismiss();
    } else {
      // Get new signature
      signatureRef.current?.readSignature();
    }
  };

  const handleSignature = (signature: string) => {
    onSave(signature);
    handleClear();
    onDismiss();
  };

  const handleClear = () => {
    signatureRef.current?.clearSignature();
    setIsEmpty(true);
  };

  const handleBegin = () => {
    setIsEmpty(false);
  };

  const style = `.m-signature-pad {
    box-shadow: none;
    border: none;
    background-color: transparent;
    margin: 0;
    width: 100%;
    height: 100%;
  }
  .m-signature-pad--body {
    border: 1px solid #e0e0e0;
    background-color: #ffffff;
    height: 100%;
  }
  .m-signature-pad--footer {
    display: none;
  }
  body {
    margin: 0;
    padding: 0;
  }`;

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modal}
      >
        <Surface style={[styles.container, { backgroundColor: theme.colors.surface }]} elevation={4}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text variant="titleLarge" style={{ color: theme.colors.onSurface }}>{title}</Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                {description}
              </Text>
            </View>
            <IconButton
              icon="close"
              onPress={onDismiss}
              style={styles.closeButton}
            />
          </View>

          {/* Signature Canvas */}
          <View style={[styles.canvasContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
            <View style={[styles.canvas, { borderColor: theme.colors.outline }]}>
              <SignatureCanvas
                ref={signatureRef}
                onOK={handleSignature}
                onBegin={handleBegin}
                onEmpty={() => setIsEmpty(true)}
                descriptionText=""
                clearText="Clear"
                confirmText="Save"
                webStyle={style}
                backgroundColor="#ffffff"
                penColor={theme.colors.primary}
                minWidth={2}
                maxWidth={4}
                imageType="image/png"
                dataURL={existingSignature}
              />
            </View>
            
            {existingSignature && isEmpty && (
              <View style={[styles.existingSignatureNote, { backgroundColor: theme.colors.primaryContainer }]}>
                <Text variant="bodySmall" style={{ color: theme.colors.onPrimaryContainer }}>
                  Using existing signature from profile. Draw to create new.
                </Text>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <Button
              mode="outlined"
              onPress={handleClear}
              style={{ marginRight: 8 }}
              disabled={isEmpty && !existingSignature}
            >
              Clear
            </Button>
            <Button
              mode="contained"
              onPress={handleSave}
              style={{ flex: 1 }}
            >
              Save Signature
            </Button>
          </View>
        </Surface>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    margin: 20,
    justifyContent: 'center',
  },
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    maxHeight: screenHeight * 0.7,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  closeButton: {
    margin: -8,
  },
  canvasContainer: {
    padding: 16,
  },
  canvas: {
    height: 250,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  existingSignatureNote: {
    marginTop: 8,
    padding: 8,
    borderRadius: 4,
  },
  actions: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
});