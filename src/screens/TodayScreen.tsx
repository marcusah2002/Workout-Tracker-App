import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Button,
  Alert,
  TextInput,
  FlatList,
  Pressable,
} from "react-native";
import { all, deleteSet, run, stopWorkoutForDate } from "../db/sqlite";
import {
  getSetsForWorkout,
  addSet,
  type Workout,
  type SetRow,
} from "../db/sqlite";
import ExercisePicker from "../components/ExcercisePicker";
import { EXERCISES } from "../data/excercises";

export default function TodayScreen() {
  const [todayWorkout, setTodayWorkout] = useState<Workout | null>(null);
  const [sets, setSets] = useState<SetRow[]>([]);
  const [exercise, setExercise] = useState("");
  const [reps, setReps] = useState("");
  const [weight, setWeight] = useState("");
  const todayISO = new Date().toLocaleDateString().slice(0, 10);

  const isActive = !!todayWorkout && !todayWorkout.ended_at;
  const isEnded = !!todayWorkout && !!todayWorkout.ended_at;

  async function reloadWorkout() {
    const rows = await all<Workout>(
      "SELECT * FROM workouts WHERE date=? ORDER BY id DESC LIMIT 1",
      [todayISO]
    );
    setTodayWorkout(rows[0] ?? null);
  }

  async function reloadSets(workoutId: number) {
    const data = await getSetsForWorkout(workoutId);
    setSets(data);
  }

  async function handleDeleteSet(id: number) {
    console.log("delete", id);
    await deleteSet(id);
    if (todayWorkout?.id) await reloadSets(todayWorkout.id);
  }

  useEffect(() => {
    (async () => {
      try {
        await reloadWorkout();
      } catch (e) {
        console.error("SELECT workout failed", e);
        Alert.alert("Fejl", "Kunne ikke læse dagens workout.");
      }
    })();
  }, [todayISO]);

  useEffect(() => {
    if (todayWorkout?.id) {
      reloadSets(todayWorkout.id).catch((err) =>
        console.error("load sets", err)
      );
    } else {
      setSets([]);
    }
  }, [todayWorkout?.id]);

  async function startOrContinue() {
    try {
      if (!todayWorkout) {
        await run("INSERT INTO workouts (date) VALUES (?)", [todayISO]);
        await reloadWorkout();
      }
    } catch (e) {
      console.error("INSERT/select failed", e);
      Alert.alert("Fejl", "Kunne ikke oprette/indlæse dagens workout");
    }
  }

  async function startNewWorkout() {
    try {
      await run("INSERT INTO workouts (date) VALUES (?)", [todayISO]);
      await reloadWorkout();
    } catch (e) {
      console.error("INSERT failed", e);
      Alert.alert("Fejl", "Kunne ikke starte ny workout.");
    }
  }

  async function stopToday() {
    try {
      await stopWorkoutForDate(todayISO);
      await reloadWorkout();
      Alert.alert("Stoppet", "Dagens workout er afsluttet.");
    } catch (e) {
      console.error("STOP failed", e);
      Alert.alert("Fejl", "Kunne ikke stoppe workout.");
    }
  }

  async function saveSet() {
    if (!todayWorkout?.id) {
      Alert.alert("Ingen workout", "Start en workout først.");
      return;
    }
    if (!exercise.trim() || !reps.trim()) {
      Alert.alert("Mangler data", "Udfyld mindst øvelse og reps.");
      return;
    }
    try {
      await addSet(
        todayWorkout.id,
        exercise,
        Number(reps),
        Number(weight) || undefined,
        "kg"
      );
      setReps("8");
      await reloadSets(todayWorkout.id);
    } catch (e) {
      console.error("addSet failed", e);
      Alert.alert("Fejl", "Kunne ikke gemme sættet.");
    }
  }

  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 20, fontWeight: "600" }}>
        Dagens workout ({todayISO})
      </Text>

      {!todayWorkout && (
        <Button title="Start workout" onPress={startOrContinue} />
      )}

      {isActive && (
        <>
          <Button title="Stop workout" onPress={stopToday} />
        </>
      )}

      {isEnded && (
        <>
          <Text>
            Afsluttet: {new Date(todayWorkout!.ended_at!).toLocaleTimeString()}
          </Text>
          <Button title="Start ny workout" onPress={startNewWorkout} />
        </>
      )}

      <View style={{ gap: 8, opacity: isEnded ? 0.5 : 1 }}>
        <Text style={{ fontWeight: "600" }}>Tilføj sæt</Text>
        <ExercisePicker
          value={exercise}
          onChange={setExercise}
          options={EXERCISES}
          placeholder="Søg/skriv øvelse"
        />

        <TextInput
          placeholder="Vægt (kg)"
          value={weight}
          onChangeText={setWeight}
          keyboardType="numeric"
          editable={!isEnded}
          style={{ borderWidth: 1, borderRadius: 8, padding: 8 }}
        />

        <TextInput
          placeholder="Reps"
          value={reps}
          onChangeText={setReps}
          keyboardType="numeric"
          editable={!isEnded}
          style={{ borderWidth: 1, borderRadius: 8, padding: 8 }}
        />
        <Button title="Gem sæt" onPress={saveSet} disabled={isEnded} />
      </View>

      <View style={{ flex: 1, marginTop: 12 }}>
        <Text style={{ fontWeight: "600", marginBottom: 8 }}>
          Denne træning
        </Text>
        <FlatList
          data={sets}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <View style={{ paddingVertical: 8, borderBottomWidth: 0.5 }}>
              <Text style={{ fontWeight: "600" }}>{item.exercise}</Text>
              <Text>
                {item.reps} reps @ {item.weight ?? 0} {item.unit ?? "kg"}
              </Text>
              <Pressable onPress={() => handleDeleteSet(item.id)} hitSlop={10}>
                <Text style={{ color: "red" }}>🗑️</Text>
              </Pressable>
            </View>
          )}
          ListEmptyComponent={<Text>Ingen sæt endnu.</Text>}
        />
      </View>
    </View>
  );
}
