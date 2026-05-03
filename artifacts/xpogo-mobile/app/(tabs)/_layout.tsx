import { Tabs } from "expo-router";
import { View, Text, StyleSheet, Platform } from "react-native";
import { BlurView } from "expo-blur";

const BG = "#0d1117";
const GREEN = "#00c853";

function TabIcon({ focused, emoji, label }: { focused: boolean; emoji: string; label: string }) {
  if (focused) {
    return (
      <View style={styles.activeTab}>
        <Text style={styles.activeEmoji}>{emoji}</Text>
        <Text style={styles.activeLabel}>{label}</Text>
      </View>
    );
  }
  return (
    <View style={styles.inactiveTab}>
      <Text style={styles.inactiveEmoji}>{emoji}</Text>
    </View>
  );
}

export default function TabLayout() {
  const isIOS = Platform.OS === "ios";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: isIOS ? "transparent" : "#0d1117",
          borderTopWidth: 0,
          borderTopColor: "transparent",
          elevation: 0,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} emoji="🎬" label="Film" />
          ),
        }}
      />
      <Tabs.Screen
        name="tv"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} emoji="📺" label="Serial TV" />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} emoji="👤" label="Profil" />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  activeTab: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#00c853",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    gap: 6,
  },
  activeEmoji: { fontSize: 15 },
  activeLabel: { color: "#fff", fontWeight: "700", fontSize: 13 },
  inactiveTab: {
    alignItems: "center",
    justifyContent: "center",
    width: 44,
    height: 36,
  },
  inactiveEmoji: { fontSize: 20, opacity: 0.5 },
});
