import React, { useMemo, useState, useRef } from "react";
import {
  View,
  TextInput,
  FlatList,
  Pressable,
  Text,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder?: string;
};

export default function ExercisePicker({
  value,
  onChange,
  options,
  placeholder,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value || "");
  const inputRef = useRef<TextInput>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options.slice(0, 20);
    return options.filter((o) => o.toLowerCase().includes(q)).slice(0, 20);
  }, [options, query]);

  function select(item: string) {
    onChange(item);
    setQuery(item);
    setOpen(false);
  }

  function submit() {
    const text = query.trim();
    if (text.length) {
      onChange(text);
      setOpen(false);
    }
  }

  function clearSearchBar() {
    setQuery("");
  }

  const showAddRow =
    query.trim().length > 0 &&
    !options.some((o) => o.toLowerCase() === query.trim().toLowerCase());

  return (
    <View style={styles.wrap}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <TextInput
          ref={inputRef}
          placeholder={placeholder ?? "Søg/skriv øvelse"}
          value={query}
          onChangeText={(t) => {
            setQuery(t);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onSubmitEditing={submit}
          style={[styles.input, { flex: 1 }]}
        />

        {query.length > 0 && (
          <Pressable onPress={clearSearchBar} style={{ marginLeft: 8 }}>
            <Ionicons name="close-circle" size={22} color="gray" />
          </Pressable>
        )}
      </View>

      {open && (
        <View style={styles.dropdown}>
          <FlatList
            keyboardShouldPersistTaps="handled"
            data={[
              ...(showAddRow ? [`➕ Tilføj “${query.trim()}”`] : []),
              ...filtered,
            ]}
            keyExtractor={(item, idx) => item + "_" + idx}
            renderItem={({ item }) => {
              const isAdd = item.startsWith("➕ ");
              const label = isAdd ? query.trim() : item;
              return (
                <Pressable
                  onPress={() => select(label)}
                  style={({ pressed }) => [
                    styles.row,
                    pressed && styles.rowPressed,
                  ]}
                >
                  <Text>{item}</Text>
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <Pressable
                onPress={submit}
                style={({ pressed }) => [
                  styles.row,
                  pressed && styles.rowPressed,
                ]}
              ></Pressable>
            }
            style={{ maxHeight: 220 }}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "relative", zIndex: 10 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: "white",
  },
  dropdown: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 48,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  row: { paddingHorizontal: 12, paddingVertical: 10 },
  rowPressed: { backgroundColor: "#f2f2f2" },
});
