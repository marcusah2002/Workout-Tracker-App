import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  Pressable,
  ActivityIndicator,
  Alert,
  Modal,
} from "react-native";
import {
  all,
  deleteWorkout,
  SetRow,
  type Workout,
  getSetsForWorkout,
} from "../db/sqlite";
import { useFocusEffect } from "@react-navigation/native";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

type Row = Workout & {
  durationMin: number | null;
};

const PAGE_SIZE = 20;

export default function HistoryScreen() {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [offset, setOffset] = useState(0);
  const [noMore, setNoMore] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsSets, setDetailsSets] = useState<SetRow[]>([]);
  const [detailsTitle, setDetailsTitle] = useState<string>("");

  const nav = useNavigation();

  async function handleDeleteWorkout(id: number) {
    if (!id) return;
    await deleteWorkout(id);
    await loadPage(true);
  }

  const loadCount = useCallback(async () => {
    try {
      const r = await all<{ c: number }>(`SELECT COUNT(*) as c FROM workouts`);
      setCount(r?.[0]?.c ?? 0);
    } catch (e) {
      console.error("count failed", e);
      setCount(null);
    }
  }, []);

  const formatDate = (isoDate: string) => {
    const [y, m, d] = isoDate.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString();
  };

  const openDetails = useCallback(
    async (w: Row) => {
      try {
        setDetailsVisible(true);
        setDetailsLoading(true);
        setDetailsTitle(
          `${w.name?.trim()?.length ? w.name : "Workout"} • ${formatDate(
            w.date
          )}`
        );

        const sets = await getSetsForWorkout(w.id);
        setDetailsSets(sets);
      } catch (e) {
        console.error("openDetails failed", e);
        Alert.alert("Fejl", "Kunne ikke hente sæt for denne workout.");
        setDetailsVisible(false);
      } finally {
        setDetailsLoading(false);
      }
    },
    [formatDate]
  );

  const closeDetails = useCallback(() => {
    setDetailsVisible(false);
    setDetailsSets([]);
    setDetailsTitle("");
  }, []);

  const calcDurationMin = (w: Workout): number | null => {
    if (!w.started_at || !w.ended_at) return null;
    const start = new Date(w.started_at).getTime();
    const end = new Date(w.ended_at).getTime();
    return Math.max(0, Math.round((end - start) / 60000));
  };

  const decorate = (rows: Workout[]): Row[] =>
    rows.map((w) => ({ ...w, durationMin: calcDurationMin(w) }));

  const loadPage = useCallback(
    async (reset = false) => {
      if (loading) return;
      setLoading(true);

      try {
        const nextOffset = reset ? 0 : offset;

        const rows = await all<Workout>(
          `SELECT *
          FROM workouts
          ORDER BY date DESC, id DESC
          LIMIT ${PAGE_SIZE} OFFSET ?`,
          [nextOffset]
        );

        const decorated = decorate(rows);

        if (reset) {
          setItems(decorated);
          setOffset(rows.length);
          setNoMore(rows.length < PAGE_SIZE);
        } else {
          setItems((prev) => [...prev, ...decorated]);
          setOffset((prev) => prev + rows.length);
          if (rows.length < PAGE_SIZE) setNoMore(true);
        }
      } catch (e) {
        console.error("loadPage Failed", e);
      } finally {
        setLoading(false);
      }
    },
    [loading, offset]
  );

  useFocusEffect(
    useCallback(() => {
      Promise.all([loadPage(true), loadCount()]).catch((e) =>
        console.error("focus load failed", e)
      );
    }, [loadPage, loadCount])
  );

  const renderItem = ({ item }: { item: any }) => {
    return (
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          padding: 12,
          borderBottomWidth: 1,
          borderColor: "#eee",
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: "600" }}>
            {item.name || "Workout"}
          </Text>
          <Text style={{ color: "#666" }}>{formatDate(item.date)}</Text>
          <Text style={{ color: "#999", fontSize: 12 }}>
            {item.durationMin
              ? `${item.durationMin} min`
              : item.ended_at
              ? "0 min"
              : "Aktiv"}
          </Text>
        </View>

        <Pressable
          onPress={() => handleDeleteWorkout(item.id)}
          style={{
            backgroundColor: "#e74c3c",
            paddingVertical: 6,
            paddingHorizontal: 12,
            borderRadius: 8,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "600" }}>Slet</Text>
        </Pressable>

        <Pressable
          onPress={() => openDetails(item)}
          style={{
            backgroundColor: "#68ff43ff",
            paddingVertical: 6,
            paddingHorizontal: 12,
            borderRadius: 8,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "600" }}>Info</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 12, paddingTop: 8 }}>
        <Text style={{ color: "#777" }}>
          {count === null ? "Tæller..." : `Antal workouts i DB: ${count}`}
        </Text>
      </View>

      <Modal
        visible={detailsVisible}
        animationType="slide"
        onRequestClose={closeDetails}
      >
        <SafeAreaView
          style={{ flex: 1, backgroundColor: "white", paddingTop: 40 }}
        >
          <View style={{ flex: 1, padding: 16, backgroundColor: "white" }}>
            <Text
              style={{ fontSize: 20, fontWeight: "bold", marginBottom: 12 }}
            >
              {detailsTitle}
            </Text>

            {detailsLoading ? (
              <Text>Henter sæt...</Text>
            ) : detailsSets.length === 0 ? (
              <Text>Ingen sæt i denne workout.</Text>
            ) : (
              <FlatList
                data={detailsSets}
                keyExtractor={(s) => String(s.id)}
                renderItem={({ item }) => (
                  <View
                    style={{
                      padding: 10,
                      borderBottomWidth: 1,
                      borderBottomColor: "#ddd",
                    }}
                  >
                    <Text style={{ fontSize: 16, fontWeight: "500" }}>
                      {item.exercise}
                    </Text>
                    <Text>
                      {item.reps} reps @ {item.weight} kg
                    </Text>
                  </View>
                )}
              />
            )}

            <Pressable
              style={{
                marginTop: 20,
                padding: 10,
                backgroundColor: "#333",
                borderRadius: 8,
                alignSelf: "center",
                marginBottom: 50,
              }}
              onPress={closeDetails}
            >
              <Text style={{ color: "white" }}>Luk</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>

      <FlatList
        data={items}
        keyExtractor={(it) => String(it.id)}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadPage(true)
                .catch((e) => console.error("refresh failed", e))
                .finally(() => setRefreshing(false));
            }}
          />
        }
        onEndReachedThreshold={0.25}
        onEndReached={() => {
          if (!loading && !noMore) loadPage();
        }}
        ListEmptyComponent={
          !loading ? (
            <View style={{ paddingVertical: 24 }}>
              <Text style={{ textAlign: "center", color: "#777" }}>
                Ingen træninger endnu.
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          loading ? (
            <View style={{ paddingVertical: 16 }}>
              <ActivityIndicator />
            </View>
          ) : noMore ? (
            <View style={{ paddingVertical: 12 }}></View>
          ) : null
        }
        contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 8 }}
      />
    </View>
  );
}
