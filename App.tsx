import "react-native-reanimated";
import { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View, ActivityIndicator } from "react-native";
import TodayScreen from "./src/screens/TodayScreen";
import HistoryScreen from "./src/screens/HistoryScreen";
import StatsScreen from "./src/screens/StatsScreen";
import { initDb } from "./src/db/sqlite";
import * as React from "react";
import { Text } from "react-native-paper";
import tw from "./src/lib/tailwind";

const Tab = createBottomTabNavigator();

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        await initDb();
      } finally {
        setReady(true);
      }
    })();
  }, []);

  if (!ready) {
    return (
      <View style={tw`flex-1 items-center justify-center bg-neutral-900`}>
        <ActivityIndicator />
        <Text>Indlæser...</Text>
      </View>
    );
  }

  return (
    <View style={tw`flex-1`}>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            sceneStyle: { backgroundColor: "white" },

            tabBarStyle: { backgroundColor: "#111827" },
            tabBarActiveTintColor: "white",
            headerStyle: { backgroundColor: "#111827" },
            headerTitleStyle: { color: "white" },
            headerTintColor: "white",
          }}
        >
          <Tab.Screen name="Start" component={TodayScreen} />
          <Tab.Screen name="Tidligere Træniger" component={HistoryScreen} />
          <Tab.Screen name="Statistikker" component={StatsScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </View>
  );
}
