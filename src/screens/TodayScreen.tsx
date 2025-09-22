import React, { useEffect, useState } from "react";
import { Modal } from "react-native";
import {
  View,
  Text,
  Button,
  Alert,
  TextInput,
  FlatList,
  Pressable,
  Platform,
} from "react-native";
import {
  all,
  deleteSet,
  stopWorkoutForDate,
  editSet,
  startWorkoutForDate,
} from "../db/sqlite";
import {
  getSetsForWorkout,
  addSet,
  startWorkout as dbStartWorkout,
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
  const todayISO = new Date().toISOString().slice(0, 10);

  const [editVisible, setEditVisible] = useState(false);
  const [editing, setEditing] = useState<SetRow | null>(null);
  const [editReps, setEditReps] = useState("");
  const [editWeight, setEditWeight] = useState("");

  const [elapsedSec, setElapsedSec] = useState(0);
  const isActive = !!todayWorkout && !todayWorkout.ended_at;
  const isEnded = !!todayWorkout && !!todayWorkout.ended_at;

  useEffect(() => {
    if (!todayWorkout?.started_at) return;
    if (todayWorkout?.ended_at) return;

    const start = new Date(todayWorkout.started_at).getTime();
    setElapsedSec(Math.floor((Date.now() - start) / 1000));

    const id = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - start) / 1000));
    }, 1000);

    return () => clearInterval(id);
  }, [todayWorkout?.started_at, todayWorkout?.ended_at]);

  function formatMMSS(total: number) {
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  async function handleStart() {
    if (Platform.OS == "ios")
      Alert.prompt("Ny workout", "hvad skal træningen hedde?", async (name) => {
        if (name) {
          await dbStartWorkout(todayISO, name);
          await reloadWorkout();
        }
      });
    else {
      await dbStartWorkout(todayISO, "Workout");
      await reloadWorkout();
    }
  }

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
    if (todayWorkout?.id)
      reloadSets(todayWorkout.id).catch((err) =>
        console.error("load sets", err)
      );
    else setSets([]);
  }, [todayWorkout?.id]);

  //Start ny træning (Efter tidligere træning er blevet afsluttet)
  async function startNewWorkout() {
    try {
      await dbStartWorkout(todayISO, "Workout");
      await handleStart();
      await reloadWorkout();
    } catch (e) {
      console.error("INSERT failed", e);
      Alert.alert("Fejl", "Kunne ikke starte ny workout.");
    }
  }

  //Stop træning
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
        weight.trim() === "" ? undefined : Number(weight),
        "kg"
      );
      setReps("");
      await reloadSets(todayWorkout.id);
    } catch (e) {
      console.error("addSet failed", e);
      Alert.alert("Fejl", "Kunne ikke gemme sættet.");
    }
  }

  // ---- EDITING ----
  function openEdit(item: SetRow) {
    setEditing(item);
    setEditReps(String(item.reps));
    setEditWeight(item.weight != null ? String(item.weight) : "");
    setEditVisible(true);
  }

  async function saveEdit() {
    if (!editing) return;
    const repsNum = parseInt(editReps, 10);
    const weightNum = editWeight.trim() === "" ? null : Number(editWeight);
    if (isNaN(repsNum)) {
      Alert.alert("Ugyldigt tal", "Reps skal være et heltal.");
      return;
    }
    try {
      await editSet(
        editing.id,
        editing.exercise,
        repsNum,
        weightNum,
        editing.unit ?? "kg"
      );
      if (todayWorkout?.id) await reloadSets(todayWorkout.id); // <-- reloader listen
      setEditVisible(false);
      setEditing(null);
    } catch (e) {
      console.error("editSet failed", e);
      Alert.alert("Fejl", "Kunne ikke gemme ændringer.");
    }
  }

  async function handleDeleteSet(id: number) {
    await deleteSet(id);
    if (todayWorkout?.id) await reloadSets(todayWorkout.id);
  }

  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 20, fontWeight: "600" }}>
        {todayWorkout?.name ?? "Dagens workout"} ({todayISO})
      </Text>
      {todayWorkout?.started_at && !todayWorkout?.ended_at && (
        <Text style={{ fontSize: 16 }}>
          Tid i gang:{" "}
          <Text style={{ fontWeight: "600" }}>{formatMMSS(elapsedSec)}</Text>
        </Text>
      )}

      {todayWorkout?.started_at && todayWorkout?.ended_at && (
        <Text style={{ fontSize: 16 }}>
          Træningens varighed:{" "}
          <Text style={{ fontWeight: "600" }}>
            {Math.round(
              (new Date(todayWorkout.ended_at).getTime() -
                new Date(todayWorkout.started_at).getTime()) /
                60000
            )}{" "}
            minut
            {Math.round(
              (new Date(todayWorkout.ended_at).getTime() -
                new Date(todayWorkout.started_at).getTime()) /
                60000
            ) === 1
              ? ""
              : "ter"}
          </Text>
        </Text>
      )}

      {!todayWorkout && <Button title="Start workout" onPress={handleStart} />}
      {isActive && <Button title="Stop workout" onPress={stopToday} />}
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
            <View
              style={{
                paddingVertical: 8,
                borderBottomWidth: 0.5,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "600" }}>{item.exercise}</Text>
                <Text>
                  {item.reps} reps med {item.weight ?? 0} {item.unit ?? "kg"}
                </Text>
              </View>

              <View style={{ flexDirection: "row", gap: 12 }}>
                <Pressable onPress={() => openEdit(item)} hitSlop={10}>
                  <Text style={{ color: "blue" }}>✏️</Text>
                </Pressable>
                <Pressable
                  onPress={() => handleDeleteSet(item.id)}
                  hitSlop={10}
                >
                  <Text style={{ color: "red" }}>🗑️</Text>
                </Pressable>
              </View>
            </View>
          )}
          ListEmptyComponent={<Text>Ingen sæt endnu.</Text>}
        />
      </View>
      <Modal visible={editVisible} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.4)",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <View
            style={{
              width: "100%",
              maxWidth: 360,
              backgroundColor: "#fff",
              borderRadius: 12,
              padding: 16,
              gap: 8,
            }}
          >
            <Text style={{ fontWeight: "600", fontSize: 16 }}>Rediger set</Text>
            <Text>Reps</Text>
            <TextInput
              value={editReps}
              onChangeText={setEditReps}
              keyboardType="numeric"
              style={{ borderWidth: 1, borderRadius: 8, padding: 8 }}
            />
            <Text>Vægt (kg)</Text>
            <TextInput
              value={editWeight}
              onChangeText={setEditWeight}
              keyboardType="numeric"
              style={{ borderWidth: 1, borderRadius: 8, padding: 8 }}
            />
            <View
              style={{
                flexDirection: "row",
                justifyContent: "flex-end",
                gap: 12,
                marginTop: 8,
              }}
            >
              <Button
                title="Annuller"
                onPress={() => {
                  setEditVisible(false);
                  setEditing(null);
                }}
              />
              <Button title="Gem" onPress={saveEdit} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
