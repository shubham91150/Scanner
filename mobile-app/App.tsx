import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Modal, Alert, Linking, Share, TextInput, Platform, SafeAreaView, StatusBar, useColorScheme } from 'react-native';
import { Camera, CameraType, FlashMode } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { BarCodeScanner } from 'expo-barcode-scanner';

import { saveHistory, loadHistory, clearHistory, ScanResult, saveTheme, loadTheme } from './src/utils/storage';
import { detectContentType, parseWifiQR, parseGeoQR } from './src/utils/parser';

// Types
type Theme = 'light' | 'dark';

export default function App() {
  // Permission State
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  // Camera State
  const [type, setType] = useState(CameraType.back);
  const [flash, setFlash] = useState(FlashMode.off);
  const [scanned, setScanned] = useState(false);
  const [zoom, setZoom] = useState(0);

  // App State
  const [history, setHistory] = useState<ScanResult[]>([]);
  const [currentResult, setCurrentResult] = useState<ScanResult | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [theme, setTheme] = useState<Theme>('light');

  // Modals
  const [resultModalVisible, setResultModalVisible] = useState(false);

  const systemColorScheme = useColorScheme();

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');

      const savedHistory = await loadHistory();
      setHistory(savedHistory);

      const savedTheme = await loadTheme();
      if (savedTheme) {
        setTheme(savedTheme);
      } else {
        setTheme(systemColorScheme === 'dark' ? 'dark' : 'light');
      }
    })();
  }, []);

  const handleBarCodeScanned = ({ type: barcodeType, data }: { type: string, data: string }) => {
    if (scanned) return;
    setScanned(true);
    processScan(data, barcodeType);
  };

  const processScan = (data: string, format: string) => {
    const contentType = detectContentType(data);
    const newResult: ScanResult = {
      text: data,
      type: contentType,
      format: format,
      timestamp: new Date().toISOString()
    };

    setCurrentResult(newResult);
    setResultModalVisible(true);

    // Add to history
    const newHistory = [newResult, ...history];
    setHistory(newHistory);
    saveHistory(newHistory);
  };

  const pickImage = async () => {
    // No permissions request is necessary for launching the image library
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
       // Note: Standard expo-camera does not support scanning from static image file out of the box.
       // In a real production app, you would use a library like 'rn-qr-generator' or Google ML Kit.
       // For this demo, we can use expo-barcode-scanner's scanFromURLAsync if available, or mock it.
       try {
         const results = await BarCodeScanner.scanFromURLAsync(result.assets[0].uri);
         if (results && results.length > 0) {
             processScan(results[0].data, results[0].type);
         } else {
             Alert.alert("No QR Code found", "Could not detect a QR code in this image.");
         }
       } catch (error) {
           Alert.alert("Error", "Could not scan image. This feature requires specific native support or valid image URI.");
       }
    }
  };

  const toggleFlash = () => {
    setFlash(flash === FlashMode.off ? FlashMode.torch : FlashMode.off);
  };

  const toggleCamera = () => {
    setType(type === CameraType.back ? CameraType.front : CameraType.back);
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    saveTheme(newTheme);
  };

  const handleCopy = async (text: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert("Copied", "Text copied to clipboard!");
  };

  const handleShare = async (text: string) => {
    try {
      await Share.share({
        message: text,
      });
    } catch (error) {
      console.log(error);
    }
  };

  const handleOpenLink = (url: string) => {
    Linking.openURL(url).catch(err => console.error("Couldn't load page", err));
  };

  const handleAction = (result: ScanResult) => {
      switch(result.type) {
          case 'url':
          case 'email':
          case 'phone':
          case 'sms':
             handleOpenLink(result.text);
             break;
          case 'wifi':
             const wifi = parseWifiQR(result.text);
             handleCopy(`SSID: ${wifi.ssid}\nPassword: ${wifi.password}`);
             break;
          case 'geo':
             const geo = parseGeoQR(result.text);
             if (geo) {
                 const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
                 const latLng = `${geo.lat},${geo.lng}`;
                 const label = 'Custom Label';
                 const url = Platform.select({
                    ios: `${scheme}${label}@${latLng}`,
                    android: `${scheme}${latLng}(${label})`
                 });
                 if (url) Linking.openURL(url);
             }
             break;
          default:
             handleCopy(result.text);
      }
  };

  const getActionIcon = (type: string) => {
      switch(type) {
          case 'url': return 'globe-outline';
          case 'email': return 'mail-outline';
          case 'phone': return 'call-outline';
          case 'sms': return 'chatbubble-outline';
          case 'wifi': return 'wifi-outline';
          case 'geo': return 'map-outline';
          default: return 'copy-outline';
      }
  };

  const getActionLabel = (type: string) => {
      switch(type) {
          case 'url': return 'Open Link';
          case 'email': return 'Send Email';
          case 'phone': return 'Call';
          case 'sms': return 'Send SMS';
          case 'wifi': return 'Copy WiFi Details';
          case 'geo': return 'Open Maps';
          default: return 'Copy Text';
      }
  };

  const deleteHistoryItem = (index: number) => {
      const newHistory = [...history];
      newHistory.splice(index, 1);
      setHistory(newHistory);
      saveHistory(newHistory);
  };

  const clearAllHistory = () => {
      Alert.alert(
          "Clear History",
          "Are you sure you want to delete all history?",
          [
              { text: "Cancel", style: "cancel" },
              { text: "Clear", style: "destructive", onPress: () => {
                  setHistory([]);
                  clearHistory();
              }}
          ]
      );
  };

  // Styles based on theme
  const isDark = theme === 'dark';
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5',
    },
    cameraContainer: {
        flex: 1,
        overflow: 'hidden',
        margin: 20,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: isDark ? '#444' : '#e0e0e0',
    },
    camera: {
      flex: 1,
    },
    overlay: {
        flex: 1,
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
    },
    scanFrame: {
        width: 250,
        height: 250,
        borderWidth: 2,
        borderColor: '#22c55e', // Success green
        backgroundColor: 'transparent',
        borderRadius: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight! + 10 : 50,
        backgroundColor: isDark ? '#2a2a2a' : '#ffffff',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: isDark ? '#f5f5f5' : '#333333',
    },
    controls: {
        flexDirection: 'row',
        justifyContent: 'center',
        padding: 20,
        gap: 20,
    },
    controlBtn: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: isDark ? '#333' : '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    activeBtn: {
        backgroundColor: '#666',
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        backgroundColor: isDark ? '#2a2a2a' : '#ffffff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: isDark ? '#f5f5f5' : '#333333',
    },
    resultTextContainer: {
        backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5',
        padding: 15,
        borderRadius: 10,
        marginBottom: 20,
        maxHeight: 200,
    },
    resultText: {
        fontSize: 16,
        color: isDark ? '#f5f5f5' : '#333333',
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    actionButtons: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        justifyContent: 'center',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#666666',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 20,
        gap: 8,
    },
    actionButtonText: {
        color: 'white',
        fontWeight: '500',
    },
    historyItem: {
        backgroundColor: isDark ? '#2a2a2a' : '#ffffff',
        padding: 15,
        marginVertical: 8,
        marginHorizontal: 16,
        borderRadius: 10,
        borderLeftWidth: 4,
        borderLeftColor: '#666666',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.41,
        elevation: 2,
    },
    historyText: {
        fontSize: 14,
        color: isDark ? '#f5f5f5' : '#333333',
        marginBottom: 5,
    },
    historyMeta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    badge: {
        backgroundColor: '#666666',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    badgeText: {
        color: 'white',
        fontSize: 12,
    },
    dateText: {
        color: isDark ? '#999' : '#666',
        fontSize: 12,
    },
    historyActions: {
        flexDirection: 'row',
        gap: 15,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    emptyText: {
        color: isDark ? '#999' : '#666',
        fontSize: 16,
    }
  });

  if (hasPermission === null) {
    return <View style={styles.container}><Text>Requesting for camera permission</Text></View>;
  }
  if (hasPermission === false) {
    return <View style={styles.container}><Text>No access to camera</Text></View>;
  }

  // History View
  if (showHistory) {
      return (
          <SafeAreaView style={styles.container}>
              <View style={styles.header}>
                  <Text style={styles.title}>History</Text>
                  <View style={{flexDirection: 'row', gap: 15}}>
                    <TouchableOpacity onPress={clearAllHistory}>
                        <Ionicons name="trash-outline" size={24} color={isDark ? '#f5f5f5' : '#333'} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setShowHistory(false)}>
                        <Ionicons name="close-outline" size={24} color={isDark ? '#f5f5f5' : '#333'} />
                    </TouchableOpacity>
                  </View>
              </View>
              {history.length === 0 ? (
                  <View style={styles.emptyState}>
                      <Ionicons name="time-outline" size={48} color={isDark ? '#444' : '#ccc'} />
                      <Text style={styles.emptyText}>No scan history yet</Text>
                  </View>
              ) : (
                <ScrollView>
                    {history.map((item, index) => (
                        <TouchableOpacity
                            key={index}
                            style={styles.historyItem}
                            onPress={() => {
                                setCurrentResult(item);
                                setResultModalVisible(true);
                            }}
                        >
                            <Text numberOfLines={1} style={styles.historyText}>{item.text}</Text>
                            <View style={styles.historyMeta}>
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>{item.type.toUpperCase()}</Text>
                                </View>
                                <View style={styles.historyActions}>
                                    <Text style={styles.dateText}>
                                        {new Date(item.timestamp).toLocaleDateString()}
                                    </Text>
                                    <TouchableOpacity onPress={() => deleteHistoryItem(index)}>
                                        <Ionicons name="trash-outline" size={16} color="red" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
              )}
          </SafeAreaView>
      );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Smart QR Scanner</Text>
        <TouchableOpacity onPress={toggleTheme}>
            <Ionicons name={isDark ? "sunny-outline" : "moon-outline"} size={24} color={isDark ? '#f5f5f5' : '#333'} />
        </TouchableOpacity>
      </View>

      {/* Camera View */}
      <View style={styles.cameraContainer}>
          <Camera
            style={styles.camera}
            type={type}
            flashMode={flash}
            zoom={zoom}
            onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
            ratio="1:1"
          >
              <View style={styles.overlay}>
                  <View style={styles.scanFrame} />
              </View>
          </Camera>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
          <TouchableOpacity style={[styles.controlBtn, flash === FlashMode.torch && styles.activeBtn]} onPress={toggleFlash}>
              <Ionicons name={flash === FlashMode.torch ? "flash" : "flash-off"} size={24} color={flash === FlashMode.torch ? '#fff' : (isDark ? '#f5f5f5' : '#333')} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.controlBtn, { width: 70, height: 70, borderRadius: 35, backgroundColor: scanned ? '#22c55e' : (isDark ? '#333' : '#fff') }]} onPress={() => setScanned(false)}>
              <Ionicons name="scan-outline" size={32} color={scanned ? '#fff' : (isDark ? '#f5f5f5' : '#333')} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.controlBtn} onPress={toggleCamera}>
              <Ionicons name="camera-reverse-outline" size={24} color={isDark ? '#f5f5f5' : '#333'} />
          </TouchableOpacity>
      </View>

      <View style={[styles.controls, {paddingTop: 0}]}>
          <TouchableOpacity style={styles.controlBtn} onPress={pickImage}>
              <Ionicons name="image-outline" size={24} color={isDark ? '#f5f5f5' : '#333'} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlBtn} onPress={() => setShowHistory(true)}>
              <Ionicons name="time-outline" size={24} color={isDark ? '#f5f5f5' : '#333'} />
          </TouchableOpacity>
      </View>

      {/* Result Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={resultModalVisible}
        onRequestClose={() => {
            setResultModalVisible(false);
            setScanned(false);
        }}
      >
        <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Scan Result</Text>
                    <TouchableOpacity onPress={() => {
                        setResultModalVisible(false);
                        setScanned(false);
                    }}>
                        <Ionicons name="close" size={24} color={isDark ? '#f5f5f5' : '#333'} />
                    </TouchableOpacity>
                </View>

                {currentResult && (
                    <>
                        <View style={{flexDirection: 'row', gap: 10, marginBottom: 15}}>
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>{currentResult.type.toUpperCase()}</Text>
                            </View>
                            <View style={[styles.badge, {backgroundColor: '#22c55e'}]}>
                                <Text style={styles.badgeText}>{currentResult.format}</Text>
                            </View>
                        </View>

                        <ScrollView style={styles.resultTextContainer}>
                            <Text style={styles.resultText}>{currentResult.text}</Text>
                        </ScrollView>

                        <View style={styles.actionButtons}>
                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => handleAction(currentResult)}
                            >
                                <Ionicons name={getActionIcon(currentResult.type)} size={20} color="white" />
                                <Text style={styles.actionButtonText}>{getActionLabel(currentResult.type)}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => handleCopy(currentResult.text)}
                            >
                                <Ionicons name="copy-outline" size={20} color="white" />
                                <Text style={styles.actionButtonText}>Copy</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => handleShare(currentResult.text)}
                            >
                                <Ionicons name="share-social-outline" size={20} color="white" />
                                <Text style={styles.actionButtonText}>Share</Text>
                            </TouchableOpacity>
                        </View>
                    </>
                )}
            </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}
