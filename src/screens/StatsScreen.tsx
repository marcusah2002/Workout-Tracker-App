import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  RefreshControl,
  Pressable,
  Dimensions,
} from "react-native";
import {
  DailyMaxRow,
  getDailyMaxWeight,
  getRecentExercises,
  type RecentExercise,
} from "../db/sqlite";
import { LineChart } from "react-native-chart-kit";
import { EXERCISE_NAMES } from "../data/excercises";
import ExercisePicker from "../components/ExcercisePicker";

export default function StatsScreen() {
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<RecentExercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [progress, setProgress] = useState<DailyMaxRow[]>([]);
  const [progressLoading, setProgressLoading] = useState(false);
  const [tip, setTip] = useState<null | { x: number; y: number; text: string }>(
    null
  );

  const loadProgressFor = useCallback(
    async (exercise: string) => {
      if (progressLoading) setProgressLoading(true);
      try {
        const rows = await getDailyMaxWeight(exercise);
        setSelected(exercise);
        setProgress(rows);
      } finally {
        setProgressLoading(false);
      }
    },
    [progressLoading]
  );

  const handlePick = useCallback(
    (val: string) => {
      const v = val.trim();
      setQuery(v);
      const isExact = EXERCISE_NAMES.some(
        (n) => n.toLowerCase() === v.toLowerCase()
      );
      if (isExact) loadProgressFor(v);
    },
    [loadProgressFor]
  );

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
      <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
        <ExercisePicker
          value={query}
          onChange={handlePick}
          options={EXERCISE_NAMES}
          placeholder="Søg/skriv øvelse"
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
            onPress={() => loadProgressFor(item.exercise)}
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
      {selected && (
        <View style={{ marginTop: 16, position: "relative" }}>
          <Text style={{ fontWeight: "700", marginBottom: 8 }}>
            {selected} — progression (maks pr. dag)
          </Text>

          {progressLoading ? (
            <Text>Indlæser graf…</Text>
          ) : progress.length === 0 ? (
            <Text style={{ color: "#777" }}>Ingen data for denne øvelse.</Text>
          ) : (
            <>
              <LineChart
                data={{
                  labels: (() => {
                    const labels = progress.map((p) => p.date);
                    const step = Math.max(1, Math.ceil(labels.length / 6));
                    return labels.map((d, i) => (i % step === 0 ? d : ""));
                  })(),
                  datasets: [{ data: progress.map((p) => p.maxWeight ?? 0) }],
                }}
                width={Dimensions.get("window").width - 32}
                height={220}
                yAxisSuffix=" kg"
                chartConfig={{
                  decimalPlaces: 0,
                  backgroundGradientFrom: "#fff",
                  backgroundGradientTo: "#fff",
                  color: (o) => `rgba(0,0,0,${o})`,
                  labelColor: (o) => `rgba(0,0,0,${o})`,
                  propsForDots: { r: "4", strokeWidth: "1", stroke: "#333" },
                }}
                bezier
                style={{ borderRadius: 12 }}
                renderDotContent={({ x, y, index }) => {
                  const p = progress[index];
                  if (!p) return null;
                  return (
                    <Text
                      key={index}
                      style={{
                        position: "absolute",
                        top: y - 20,
                        left: x - 10,
                        fontSize: 10,
                        color: "#333",
                      }}
                    >
                      {p.reps}x
                    </Text>
                  );
                }}
              />

              {tip && (
                <View
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    left: Math.max(8, tip.x - 70),
                    top: Math.max(8, tip.y - 48),
                    backgroundColor: "rgba(0,0,0,0.75)",
                    paddingVertical: 6,
                    paddingHorizontal: 8,
                    borderRadius: 8,
                  }}
                >
                  <Text
                    style={{
                      color: "#fff",
                      fontSize: 12,
                      lineHeight: 16,
                      textAlign: "center",
                    }}
                  >
                    {tip.text}
                  </Text>
                </View>
              )}
            </>
          )}
        </View>
      )}
    </View>
  );
}
