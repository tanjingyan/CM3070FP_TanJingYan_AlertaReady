import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { REGION_OPTIONS } from '../data/preparednessByCountry';
import { usePreparednessRegion } from '../hooks/usePreparednessRegion';

type PreparednessRegionState =
  ReturnType<typeof usePreparednessRegion>;

export default function PreparednessRegionCard({
  region,
}: {
  region: PreparednessRegionState;
}) {
  const {
    mode,
    profile,
    detecting,
    detectionError,
    detectedCountryName,
    useAutomaticRegion,
    setManualRegion,
  } = region;

  const [visible, setVisible] = useState(false);

  async function chooseRegion(
    code: string,
    name: string
  ) {
    if (code === 'AUTO') {
      await useAutomaticRegion();
    } else {
      await setManualRegion(code, name);
    }

    setVisible(false);
  }

  return (
    <>
      <View style={styles.card}>
        <View style={styles.iconBox}>
          <Text style={styles.icon}>🌍</Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.label}>
            Preparedness region
          </Text>

          <Text style={styles.country}>
            {detecting
              ? 'Detecting location...'
              : profile.name}
          </Text>

          <Text style={styles.sub}>
            {mode === 'auto'
              ? detectedCountryName
                ? 'Using current device location'
                : detectionError ||
                  'Automatic location'
              : 'Manual region selection'}
          </Text>
        </View>

        <Pressable
          style={styles.changeButton}
          onPress={() => setVisible(true)}
        >
          <Text style={styles.changeText}>
            Change
          </Text>
        </Pressable>
      </View>

      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.backdrop}
            onPress={() => setVisible(false)}
          />

          <View style={styles.sheet}>
            <View style={styles.handle} />

            <Text style={styles.sheetTitle}>
              Preparedness Region
            </Text>

            <Text style={styles.sheetText}>
              Use your current location or choose a region manually.
              The selection is shared by Contacts, Documents and
              Evacuation.
            </Text>

            <ScrollView
              style={styles.optionsScroll}
              showsVerticalScrollIndicator={false}
            >
              {REGION_OPTIONS.map(option => (
                <Pressable
                  key={option.code}
                  style={styles.option}
                  onPress={() =>
                    chooseRegion(
                      option.code,
                      option.name
                    )
                  }
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.optionTitle}>
                      {option.name}
                    </Text>

                    {option.code === 'AUTO' && (
                      <Text style={styles.optionSub}>
                        Detect country using Expo Location
                      </Text>
                    )}
                  </View>

                  <Text style={styles.chevron}>
                    ›
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Pressable
              style={styles.cancelButton}
              onPress={() => setVisible(false)}
            >
              <Text style={styles.cancelText}>
                Cancel
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 11,
    marginBottom: 14,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#DDE7E2',
    backgroundColor: '#FFFFFF',
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
  },
  icon: {
    fontSize: 18,
  },
  label: {
    fontSize: 8,
    fontWeight: '800',
    color: '#6B7280',
  },
  country: {
    marginTop: 1,
    fontSize: 11,
    fontWeight: '900',
    color: '#111827',
  },
  sub: {
    marginTop: 1,
    fontSize: 7,
    lineHeight: 10,
    color: '#9CA3AF',
  },
  changeButton: {
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#F0FDF4',
  },
  changeText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#047857',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(17,24,39,0.38)',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  sheet: {
    maxHeight: '72%',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#FFFFFF',
  },
  handle: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    marginBottom: 14,
    borderRadius: 999,
    backgroundColor: '#D1D5DB',
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#111827',
  },
  sheetText: {
    marginTop: 5,
    marginBottom: 12,
    fontSize: 9,
    lineHeight: 13,
    color: '#6B7280',
  },
  optionsScroll: {
    flexGrow: 0,
  },
  option: {
    minHeight: 51,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 9,
    marginBottom: 7,
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
  },
  optionTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#111827',
  },
  optionSub: {
    marginTop: 2,
    fontSize: 7,
    color: '#9CA3AF',
  },
  chevron: {
    fontSize: 20,
    color: '#9CA3AF',
  },
  cancelButton: {
    minHeight: 42,
    marginTop: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#6B7280',
  },
});
