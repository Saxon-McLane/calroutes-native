import { useAppStore, type FitnessLevel, type Sex, type Units } from "@/src/store/AppStore";
import React, { useEffect, useMemo, useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProfileScreen() {
  const { profile, setProfile } = useAppStore();

  const [name, setName] = useState(profile.name ?? "");
  const [age, setAge] = useState(String(profile.age ?? ""));
  const [sex, setSex] = useState<Sex>(profile.sex ?? "male");
  const [units, setUnits] = useState<Units>(profile.units ?? "imperial");

  // Canonical stored values
  const [heightCmInput, setHeightCmInput] = useState(String(profile.heightCm ?? ""));
  const [heightInInput, setHeightInInput] = useState(
    profile.heightCm ? String(Math.round(profile.heightCm / 2.54)) : ""
  );
  const [weightLbsInput, setWeightLbsInput] = useState(String(profile.weightLbs ?? ""));
  const [weightKgInput, setWeightKgInput] = useState(
    profile.weightLbs ? String(Math.round((profile.weightLbs * 10) * 0.453592) / 10) : ""
  );

  const [fitnessLevel, setFitnessLevel] = useState<FitnessLevel>(profile.fitnessLevel ?? "beginner");
  const [weeklyCalorieGoal, setWeeklyCalorieGoal] = useState(
    String(profile.weeklyCalorieGoal ?? 2000)
  );

  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Keep local form in sync if profile changes externally
    setName(profile.name ?? "");
    setAge(String(profile.age ?? ""));
    setSex(profile.sex ?? "male");
    setUnits(profile.units ?? "imperial");
    setHeightCmInput(String(profile.heightCm ?? ""));
    setHeightInInput(profile.heightCm ? String(Math.round(profile.heightCm / 2.54)) : "");
    setWeightLbsInput(String(profile.weightLbs ?? ""));
    setWeightKgInput(
      profile.weightLbs ? String(Math.round((profile.weightLbs * 10) * 0.453592) / 10) : ""
    );
    setFitnessLevel(profile.fitnessLevel ?? "beginner");
    setWeeklyCalorieGoal(String(profile.weeklyCalorieGoal ?? 2000));
    setDirty(false);
  }, [profile]);

  const numericOrNaN = (v: string) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : NaN;
  };

  const validationErrors = useMemo(() => {
    const errors: string[] = [];

    const ageVal = numericOrNaN(age);
    if (!Number.isFinite(ageVal) || ageVal < 10 || ageVal > 100) {
      errors.push("age");
    }

    const weeklyGoalVal = numericOrNaN(weeklyCalorieGoal);
    if (!Number.isFinite(weeklyGoalVal) || weeklyGoalVal < 200 || weeklyGoalVal > 10000) {
      errors.push("weeklyCalorieGoal");
    }

    if (units === "imperial") {
      const hIn = numericOrNaN(heightInInput);
      if (!Number.isFinite(hIn) || hIn < 48 || hIn > 84) {
        errors.push("height");
      }
      const wLbs = numericOrNaN(weightLbsInput);
      if (!Number.isFinite(wLbs) || wLbs < 70 || wLbs > 400) {
        errors.push("weight");
      }
    } else {
      const hCm = numericOrNaN(heightCmInput);
      // Roughly 48–84 in converted to cm
      if (!Number.isFinite(hCm) || hCm < 120 || hCm > 213) {
        errors.push("height");
      }
      const wKg = numericOrNaN(weightKgInput);
      if (!Number.isFinite(wKg) || wKg < 32 || wKg > 181) {
        errors.push("weight");
      }
    }

    return errors;
  }, [age, heightCmInput, heightInInput, weightKgInput, weightLbsInput, weeklyCalorieGoal, units]);

  const hasErrors = validationErrors.length > 0;

  const handleSave = () => {
    if (hasErrors) return;

    const ageVal = numericOrNaN(age);
    const weeklyGoalVal = numericOrNaN(weeklyCalorieGoal);

    let heightCm = profile.heightCm;
    let weightLbs = profile.weightLbs;

    if (units === "imperial") {
      const hIn = numericOrNaN(heightInInput);
      const wLbs = numericOrNaN(weightLbsInput);
      if (Number.isFinite(hIn)) {
        heightCm = hIn * 2.54;
      }
      if (Number.isFinite(wLbs)) {
        weightLbs = wLbs;
      }
    } else {
      const hCm = numericOrNaN(heightCmInput);
      const wKg = numericOrNaN(weightKgInput);
      if (Number.isFinite(hCm)) {
        heightCm = hCm;
      }
      if (Number.isFinite(wKg)) {
        weightLbs = wKg * 2.20462;
      }
    }

    setProfile({
      name: name.trim(),
      age: Number.isFinite(ageVal) ? ageVal : profile.age,
      sex,
      units,
      heightCm,
      weightLbs,
      fitnessLevel,
      weeklyCalorieGoal: Number.isFinite(weeklyGoalVal)
        ? weeklyGoalVal
        : profile.weeklyCalorieGoal,
    });

    setDirty(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const renderSegment = <T extends string>(
    options: readonly T[],
    value: T,
    onChange: (v: T) => void
  ) => (
    <View style={styles.segmentRow}>
      {options.map((opt) => {
        const selected = opt === value;
        return (
          <Pressable
            key={opt}
            onPress={() => {
              onChange(opt);
              setDirty(true);
            }}
            style={[
              styles.segmentChip,
              selected && styles.segmentChipSelected,
            ]}
          >
            <Text
              style={[
                styles.segmentLabel,
                selected && styles.segmentLabelSelected,
              ]}
            >
              {opt.charAt(0).toUpperCase() + opt.slice(1)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  const isSaveDisabled = !dirty || hasErrors;

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={80}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.screenTitle}>Profile</Text>

          {/* Basics */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Basics</Text>
            <View style={styles.fieldRow}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                placeholder="Your name"
                value={name}
                onChangeText={(t) => {
                  setName(t);
                  setDirty(true);
                }}
                style={styles.input}
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.fieldRow}>
              <Text style={styles.label}>Age</Text>
              <TextInput
                value={age}
                onChangeText={(t) => {
                  setAge(t.replace(/[^0-9]/g, ""));
                  setDirty(true);
                }}
                keyboardType="number-pad"
                style={styles.input}
                placeholder="Age"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.fieldRow}>
              <Text style={styles.label}>Sex</Text>
              {renderSegment<Sex>(["male", "female"], sex, setSex)}
            </View>
          </View>

          {/* Body */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Body</Text>

            <View style={styles.fieldRow}>
              <Text style={styles.label}>Units</Text>
              {renderSegment<Units>(["imperial", "metric"], units, setUnits)}
            </View>

            {units === "imperial" ? (
              <>
                <View style={styles.fieldRow}>
                  <Text style={styles.label}>Height (in)</Text>
                  <TextInput
                    value={heightInInput}
                    onChangeText={(t) => {
                      setHeightInInput(t.replace(/[^0-9.]/g, ""));
                      setDirty(true);
                    }}
                    keyboardType="numeric"
                    style={styles.input}
                    placeholder="Height in inches"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
                <View style={styles.fieldRow}>
                  <Text style={styles.label}>Weight (lbs)</Text>
                  <TextInput
                    value={weightLbsInput}
                    onChangeText={(t) => {
                      setWeightLbsInput(t.replace(/[^0-9.]/g, ""));
                      setDirty(true);
                    }}
                    keyboardType="numeric"
                    style={styles.input}
                    placeholder="Weight in pounds"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </>
            ) : (
              <>
                <View style={styles.fieldRow}>
                  <Text style={styles.label}>Height (cm)</Text>
                  <TextInput
                    value={heightCmInput}
                    onChangeText={(t) => {
                      setHeightCmInput(t.replace(/[^0-9.]/g, ""));
                      setDirty(true);
                    }}
                    keyboardType="numeric"
                    style={styles.input}
                    placeholder="Height in cm"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
                <View style={styles.fieldRow}>
                  <Text style={styles.label}>Weight (kg)</Text>
                  <TextInput
                    value={weightKgInput}
                    onChangeText={(t) => {
                      setWeightKgInput(t.replace(/[^0-9.]/g, ""));
                      setDirty(true);
                    }}
                    keyboardType="numeric"
                    style={styles.input}
                    placeholder="Weight in kg"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </>
            )}
          </View>

          {/* Training */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Training</Text>
            <View style={styles.fieldRow}>
              <Text style={styles.label}>Fitness Level</Text>
              {renderSegment<FitnessLevel>(
                ["beginner", "intermediate", "advanced"],
                fitnessLevel,
                setFitnessLevel
              )}
            </View>
          </View>

          {/* Goals */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Goals</Text>
            <View style={styles.fieldRow}>
              <Text style={styles.label}>Weekly Calorie Goal</Text>
              <TextInput
                value={weeklyCalorieGoal}
                onChangeText={(t) => {
                  setWeeklyCalorieGoal(t.replace(/[^0-9]/g, ""));
                  setDirty(true);
                }}
                keyboardType="number-pad"
                style={styles.input}
                placeholder="e.g. 2000"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>

          <View style={styles.saveRow}>
            {saved && <Text style={styles.savedText}>Saved</Text>}
            <Pressable
              style={[styles.saveButton, isSaveDisabled && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={isSaveDisabled}
            >
              <Text style={styles.saveButtonLabel}>Save</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 32,
    gap: 16,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 10,
  },
  fieldRow: {
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
    marginBottom: 4,
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#F9FAFB",
  },
  segmentRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  segmentChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    alignItems: "center",
  },
  segmentChipSelected: {
    backgroundColor: "#EEF2FF",
    borderColor: "#4F46E5",
  },
  segmentLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#4B5563",
    textTransform: "capitalize",
  },
  segmentLabelSelected: {
    color: "#111827",
  },
  saveRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  savedText: {
    fontSize: 13,
    color: "#16A34A",
    fontWeight: "700",
  },
  saveButton: {
    flex: 1,
    marginLeft: 12,
    backgroundColor: "#4F46E5",
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
  },
  saveButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  saveButtonLabel: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 15,
  },
});