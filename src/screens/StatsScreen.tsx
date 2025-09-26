import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  RefreshControl,
  Pressable,
} from "react-native";
import { getRecentExercises, type RecentExercise } from "../db/sqlite";

export default function StatsScreen() {
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<RecentExercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadRecentExercises = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      const rows = await getRecentExercises(10);
      setRecent(rows);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  useEffect(() => {
    loadRecentExercises().catch(console.error);
  }, [loadRecentExercises]);

  return (
    <View style={{ flex: 1, padding: 16, backgroundColor: "white" }}>
      <View
        style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}
      >
        <TextInput
          placeholder="Søg efter øvelse…"
          value={query}
          onChangeText={setQuery}
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: "#ccc",
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 10,
            backgroundColor: "white",
          }}
        />
      </View>

      <Text style={{ fontWeight: "700", marginBottom: 7 }}>
        Seneste øvelser
      </Text>
      <FlatList
        data={recent}
        keyExtractor={(it, idx) => it.exercise + "_" + idx}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => {}}
            style={({ pressed }) => ({
              paddingVertical: 10,
              borderBottomWidth: 0.5,
              borderColor: "#eee",
              backgroundColor: pressed ? "#f8f8f8" : "white",
            })}
          >
            <Text style={{ fontWeight: "600" }}>{item.exercise}</Text>
            <Text style={{ color: "#666", fontSize: 12 }}>
              Sidst logget: {item.lastDate} · {item.setCount} sæt i alt
            </Text>
          </Pressable>
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadRecentExercises()
                .catch(console.error)
                .finally(() => setRefreshing(false));
            }}
          />
        }
        ListEmptyComponent={
          !loading ? (
            <Text style={{ color: "#777" }}>Ingen øvelser.</Text>
          ) : null
        }
        contentContainerStyle={{ paddingBottom: 16 }}
      />
    </View>
  );
}
