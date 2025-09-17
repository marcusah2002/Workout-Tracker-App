import React, { useMemo, useState, useRef } from "react";
import {
  View,
  TextInput,
  FlatList,
  Pressable,
  Text,
  StyleSheet,
} from "react-native";

type Props = {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder?: string;
};

export default function ExcercisePicker({
  value,
  onChange,
  options,
  placeholder,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value || "");
}
