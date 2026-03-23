import { useAppStore, type FitnessLevel, type Sex, type Units } from "@/src/store/AppStore";
import { Ionicons } from "@expo/vector-icons";
import { Slider } from "@miblanchard/react-native-slider";
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
  const weeklyGoalNumber = Number(weeklyCalorieGoal) || 2000;
  const estimatedWorkoutCalories =
    fitnessLevel === "beginner" ? 300 : fitnessLevel === "intermediate" ? 450 : 600;
  const estimatedWorkoutsPerWeek = Math.max(1, Math.round(weeklyGoalNumber / estimatedWorkoutCalories));

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

  const renderPills = <T extends string>(
    options: readonly { value: T; label: string; icon: keyof typeof Ionicons.glyphMap }[],
    value: T,
    onChange: (v: T) => void
  ) => (
    <View style={styles.pillRow}>
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => {
              onChange(opt.value);
              setDirty(true);
            }}
            style={[
              styles.pillChip,
              selected && styles.pillChipSelected,
            ]}
          >
            <Ionicons
              name={opt.icon}
              size={14}
              style={styles.pillIcon}
              color={selected ? "#FFFFFF" : "#6B7280"}
            />
            <Text style={[styles.pillLabel, selected && styles.pillLabelSelected]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  const renderLabelPills = <T extends string>(
    options: readonly { value: T; label: string }[],
    value: T,
    onChange: (v: T) => void
  ) => (
    <View style={styles.pillRow}>
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <Pressable
            key={String(opt.value)}
            onPress={() => {
              onChange(opt.value);
              setDirty(true);
            }}
            style={[
              styles.pillChip,
              styles.pillChipGrow,
              selected && styles.pillChipSelected,
            ]}
          >
            <Text style={[styles.pillLabel, selected && styles.pillLabelSelected]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  const isSaveDisabled = !dirty || hasErrors;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={80}
      >
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <Text style={styles.screenTitle}>Your Profile</Text>
          <Text style={styles.screenSubtitle}>Used to personalize your routes</Text>

          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="person-circle-outline" size={18} color="#4F46E5" />
              <Text style={styles.cardTitle}>Profile</Text>
            </View>
            <Text style={styles.helperText}>
              We use these basics to personalize pace, route intensity, and calorie burn estimates.
            </Text>
            <View style={styles.fieldRow}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                placeholder="Your name"
                value={name}
                onChangeText={(t: string) => {
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
                onChangeText={(t: string) => {
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
              {renderLabelPills<Sex>(
                [
                  { value: "male", label: "Male" },
                  { value: "female", label: "Female" },
                ],
                sex,
                setSex
              )}
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="body-outline" size={18} color="#4F46E5" />
              <Text style={styles.cardTitle}>Body</Text>
            </View>

            <View style={styles.fieldRow}>
              <Text style={styles.label}>Units</Text>
              {renderPills<Units>(
                [
                  { value: "imperial", label: "Imperial", icon: "speedometer-outline" },
                  { value: "metric", label: "Metric", icon: "analytics-outline" },
                ],
                units,
                setUnits
              )}
            </View>

            {units === "imperial" ? (
              <>
                <View style={styles.fieldRow}>
                  <Text style={styles.label}>Height (in)</Text>
                  <TextInput
                    value={heightInInput}
                    onChangeText={(t: string) => {
                      setHeightInInput(t.replace(/[^0-9.]/g, ""));
                      setDirty(true);
                    }}
                    keyboardType="decimal-pad"
                    style={styles.input}
                    placeholder="e.g. 68"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
                <View style={styles.fieldRow}>
                  <Text style={styles.label}>Weight (lbs)</Text>
                  <TextInput
                    value={weightLbsInput}
                    onChangeText={(t: string) => {
                      setWeightLbsInput(t.replace(/[^0-9.]/g, ""));
                      setDirty(true);
                    }}
                    keyboardType="decimal-pad"
                    style={styles.input}
                    placeholder="e.g. 165"
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
                    onChangeText={(t: string) => {
                      setHeightCmInput(t.replace(/[^0-9.]/g, ""));
                      setDirty(true);
                    }}
                    keyboardType="decimal-pad"
                    style={styles.input}
                    placeholder="e.g. 175"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
                <View style={styles.fieldRow}>
                  <Text style={styles.label}>Weight (kg)</Text>
                  <TextInput
                    value={weightKgInput}
                    onChangeText={(t: string) => {
                      setWeightKgInput(t.replace(/[^0-9.]/g, ""));
                      setDirty(true);
                    }}
                    keyboardType="decimal-pad"
                    style={styles.input}
                    placeholder="e.g. 72"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </>
            )}
            <Text style={styles.helperText}>
              Used to refine route distance recommendations and improve calorie calculation per route.
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="barbell-outline" size={18} color="#4F46E5" />
              <Text style={styles.cardTitle}>Training</Text>
            </View>
            <Text style={styles.helperText}>
              Your level adjusts target difficulty so suggested routes challenge you without overreaching.
            </Text>
            <View style={styles.fieldRow}>
              <Text style={styles.label}>Fitness Level</Text>
              {renderPills<FitnessLevel>(
                [
                  { value: "beginner", label: "Beginner", icon: "leaf-outline" },
                  { value: "intermediate", label: "Intermediate", icon: "flash-outline" },
                  { value: "advanced", label: "Advanced", icon: "trophy-outline" },
                ],
                fitnessLevel,
                setFitnessLevel
              )}
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="flag-outline" size={18} color="#4F46E5" />
              <Text style={styles.cardTitle}>Goals</Text>
            </View>
            <Text style={styles.helperText}>
              Weekly calorie targets guide route frequency suggestions and keep your training plan realistic.
            </Text>
            <View style={styles.goalRow}>
              <Text style={styles.label}>Weekly Calorie Goal</Text>
              <Text style={styles.goalValue}>{weeklyGoalNumber} kcal</Text>
            </View>
            <Slider
              minimumValue={200}
              maximumValue={10000}
              step={100}
              value={weeklyGoalNumber}
              onValueChange={(v: number[]) => {
                setWeeklyCalorieGoal(String(v[0]));
                setDirty(true);
              }}
              minimumTrackTintColor="#4F46E5"
              maximumTrackTintColor="#E5E7EB"
              thumbTintColor="#4F46E5"
              containerStyle={styles.slider}
            />
            <Text style={styles.workoutEstimate}>
              ~{estimatedWorkoutsPerWeek} workouts/week
            </Text>
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>

        <View style={styles.saveBar}>
          <View>
            {saved ? <Text style={styles.savedText}>Saved</Text> : null}
            <Text style={styles.saveHint}>Save updates to recalculate route suggestions</Text>
          </View>
          <Pressable
            style={[styles.saveButton, isSaveDisabled && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isSaveDisabled}
          >
            <Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" />
            <Text style={styles.saveButtonLabel}>Save Profile</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F5F6FA",
  },
  container: {
    paddingHorizontal: 18,
    paddingTop: 16,
    gap: 18,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
  },
  screenSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
    marginBottom: 2,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  helperText: {
    fontSize: 12,
    lineHeight: 18,
    color: "#6B7280",
    marginTop: 8,
    marginBottom: 12,
  },
  fieldRow: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
    marginBottom: 6,
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
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 4,
  },
  pillChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  pillChipGrow: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
  },
  pillChipSelected: {
    backgroundColor: "#4F46E5",
    borderColor: "#4F46E5",
  },
  pillIcon: {
    marginTop: 1,
  },
  pillLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#4B5563",
  },
  pillLabelSelected: {
    color: "#FFFFFF",
  },
  goalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  goalValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  slider: {
    marginTop: 4,
  },
  workoutEstimate: {
    marginTop: 6,
    fontSize: 13,
    color: "#4B5563",
    fontWeight: "600",
  },
  bottomSpacer: {
    height: 112,
  },
  saveBar: {
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 16,
    backgroundColor: "rgba(255,255,255,0.98)",
  },
  savedText: {
    fontSize: 13,
    color: "#16A34A",
    fontWeight: "700",
  },
  saveHint: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
    marginBottom: 10,
  },
  saveButton: {
    width: "100%",
    backgroundColor: "#4F46E5",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
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