import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import api from '../lib/api';
import { OfflineSyncEngine } from '../lib/offline-sync';
import { typography } from '../theme/typography';
import { colors } from '../theme/colors';
import { NeonButton } from '../components/NeonButton';
import { GlassCard } from '../components/GlassCard';

export default function PODScreen({ navigation, route }: any) {
  const deliveryId = route.params?.deliveryId;
  const trackingCode = route.params?.trackingCode || 'N/A';
  const [permission, requestPermission] = useCameraPermissions();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'IDLE' | 'CAMERA_ACTIVE' | 'CAPTURED'>('IDLE');
  const cameraRef = useRef<any>(null);

  if (!deliveryId) {
    return (
      <View style={styles.container}>
        <Text style={[typography.body1, { color: colors.textMuted, textAlign: 'center', marginTop: 100 }]}>
          Không tìm thấy thông tin đơn hàng để xác nhận giao hàng.
        </Text>
      </View>
    );
  }

  if (!permission) {
    return <View style={styles.container} />; // Loading permissions
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={[typography.body1, { color: colors.text, textAlign: 'center', marginTop: 100 }]}>
          We need your permission to show the camera
        </Text>
        <NeonButton title="Grant Permission" onPress={requestPermission} style={{ marginTop: 20 }} />
      </View>
    );
  }

  const handleCaptureAndUpload = async () => {
    if (!cameraRef.current) return;
    
    setLoading(true);
    let photo: any = null;
    try {
      photo = await cameraRef.current.takePictureAsync({ quality: 0.5 });
      
      const formData = new FormData();
      formData.append('file', {
        uri: photo.uri,
        name: `pod_${deliveryId}.jpg`,
        type: 'image/jpeg',
      } as any);

      console.log(` Đang upload POD cho Delivery: ${deliveryId}`);
      await api.post(`/mobile/uploads/pod/${deliveryId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setStatus('CAPTURED');
      Alert.alert('Thành công', 'Bằng chứng giao hàng đã được tải lên hệ thống.');
    } catch (error) {
      console.error('❌ Upload POD lỗi:', error);
      // If photo captured, queue for later upload
      if (photo) {
        const payload = {
          uri: photo.uri,
          name: `pod_${deliveryId}.jpg`,
          type: 'image/jpeg',
        };
        const action = OfflineSyncEngine.createAction(`mobile/uploads/pod/${deliveryId}`, 'CREATE', payload);
        await OfflineSyncEngine.addToQueue(action);
        Alert.alert('Lưu offline', 'Ảnh sẽ được tải lên khi có kết nối mạng.');
      } else {
        Alert.alert('Lỗi', 'Không thể chụp ảnh hoặc upload. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[typography.h1, { color: colors.text }]}>Xác nhận Giao hàng</Text>
        <Text style={[typography.body1, { color: colors.success, marginTop: 4 }]}>Vận đơn: {trackingCode}</Text>
      </View>
      
      <GlassCard style={styles.canvasContainer}>
        {status === 'CAPTURED' ? (
          <View style={styles.successView}>
            <Text style={styles.successIcon}></Text>
            <Text style={[typography.h2, { color: colors.success }]}>Đã chụp ảnh & Upload</Text>
          </View>
        ) : status === 'CAMERA_ACTIVE' ? (
          <CameraView style={styles.camera} ref={cameraRef} facing="back" />
        ) : (
          <View style={styles.placeholder}>
            <Text style={[typography.body1, { color: colors.textMuted }]}>Nhấn vào nút bên dưới để mở Camera</Text>
          </View>
        )}
      </GlassCard>
      
      {status === 'IDLE' ? (
        <NeonButton 
          title="MỞ CAMERA" 
          onPress={() => setStatus('CAMERA_ACTIVE')}
        />
      ) : status === 'CAMERA_ACTIVE' ? (
        <NeonButton 
          title="📸 CHỤP ẢNH & XÁC NHẬN" 
          onPress={handleCaptureAndUpload}
          loading={loading}
        />
      ) : (
        <NeonButton 
          title="HOÀN TẤT CHUYẾN ĐI" 
          variant="secondary"
          onPress={() => navigation.goBack()}
        />
      )}
      
      <Text style={[typography.caption, styles.footerNote]}>
        * Ảnh sẽ được lưu trữ an toàn trên hệ thống
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 20 },
  header: { marginBottom: 30 },
  canvasContainer: { 
    height: 400, 
    marginBottom: 30,
    padding: 0,
    overflow: 'hidden',
  },
  camera: { flex: 1, borderRadius: 16 },
  placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  successView: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  successIcon: { fontSize: 60, marginBottom: 16 },
  footerNote: { color: colors.textMuted, textAlign: 'center', marginTop: 24 }
});
