import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { all, type Workout } from "../db/sqlite";

type Row = Workout & {
  durationMin: number | null;
};

const PAGE_SIZE = 20;

export default function HistoryScreen();
{
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [offset, setOffset] = useState(0);
  const [noMore, setNoMore] = useState(false);
  const formatDate = (isoDate: string) => {
    const [y, m, d] = isoDate.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString();
  };

  const calcDurationMin = (w: Workout): number | null => {
    if (!w.started_at || !w.ended_at) return null;
    const start = new Date(w.started_at).getTime();
    const end = new Date(w.ended_at).getTime();
    return Math.max(0, Math.round(end - start / 6000));
  };

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text>Tidligere Træninger</Text>
    </View>
  );
}
