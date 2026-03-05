import { StatusBar } from "expo-status-bar";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { appConfigSummary, getPaperclipConfig } from "./src/config";
import { fetchInboxIssues, type IssueSummary } from "./src/paperclipApi";
import { TEST_IDS } from "./src/testIds";

const DEFAULT_API_KEY = process.env.EXPO_PUBLIC_PAPERCLIP_API_KEY ?? "";
const QA_SEEDED_API_KEY = process.env.EXPO_PUBLIC_QA_SEEDED_API_KEY ?? "";

function formatTimestamp(iso: string): string {
  const value = Date.parse(iso);
  if (Number.isNaN(value)) {
    return iso;
  }

  return new Date(value).toLocaleString();
}

export default function App() {
  const config = useMemo(() => getPaperclipConfig(), []);
  const [apiKey, setApiKey] = useState(DEFAULT_API_KEY);
  const [issues, setIssues] = useState<IssueSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadedAt, setLoadedAt] = useState<string | null>(null);
  const [hasSession, setHasSession] = useState(DEFAULT_API_KEY.trim().length > 0);

  const hasRequiredConfig = config.missing.length === 0;
  const hasQaFixture = QA_SEEDED_API_KEY.trim().length > 0;
  const canSubmitAuth = apiKey.trim().length > 0 && hasRequiredConfig && !loading;
  const canRefresh = hasSession && hasRequiredConfig && !loading;
  const configText = appConfigSummary(config);

  const loadIssues = useCallback(
    async (tokenOverride?: string) => {
      const token = (tokenOverride ?? apiKey).trim();
      if (!hasRequiredConfig) {
        setError("Set required app config values before continuing.");
        return;
      }
      if (token.length === 0) {
        setError("Enter a bearer token to continue.");
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const nextIssues = await fetchInboxIssues({
          apiKey: token,
          config,
        });
        setIssues(nextIssues);
        setHasSession(true);
        setLoadedAt(new Date().toISOString());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown request error.");
      } finally {
        setLoading(false);
      }
    },
    [apiKey, config, hasRequiredConfig],
  );

  const handleAuthSubmit = useCallback(() => {
    void loadIssues();
  }, [loadIssues]);

  const handleRefresh = useCallback(() => {
    if (!hasSession) {
      return;
    }
    void loadIssues();
  }, [hasSession, loadIssues]);

  const handleQaFixtureAuth = useCallback(() => {
    if (!hasQaFixture) {
      setError("No QA auth fixture configured.");
      return;
    }
    setApiKey(QA_SEEDED_API_KEY);
    void loadIssues(QA_SEEDED_API_KEY);
  }, [hasQaFixture, loadIssues]);

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Paperclip Inbox</Text>
          <Text style={styles.subtitle}>Read-only Android spike shell</Text>
          <Text style={styles.config}>{configText}</Text>
        </View>

        <View style={styles.authPanel} testID={TEST_IDS.authForm}>
          <Text style={styles.inputLabel}>Bearer token</Text>
          <TextInput
            testID={TEST_IDS.authTokenInput}
            value={apiKey}
            onChangeText={setApiKey}
            placeholder="Paste Paperclip API key"
            placeholderTextColor="#8B8E96"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />
          <View style={styles.actions}>
            <Pressable
              testID={TEST_IDS.authSubmitButton}
              onPress={handleAuthSubmit}
              style={[styles.button, !canSubmitAuth && styles.buttonDisabled]}
              disabled={!canSubmitAuth}
            >
              <Text style={styles.buttonText}>
                {loading ? "Loading..." : "Sign in"}
              </Text>
            </Pressable>
            <Pressable
              testID={TEST_IDS.refreshAction}
              onPress={handleRefresh}
              style={[styles.buttonSecondary, !canRefresh && styles.buttonDisabled]}
              disabled={!canRefresh}
            >
              <Text style={styles.buttonSecondaryText}>Refresh inbox</Text>
            </Pressable>
          </View>
          {hasQaFixture ? (
            <Pressable
              testID={TEST_IDS.qaFixtureButton}
              onPress={handleQaFixtureAuth}
              style={[styles.buttonGhost, loading && styles.buttonDisabled]}
              disabled={loading}
            >
              <Text style={styles.buttonGhostText}>Use QA fixture token</Text>
            </Pressable>
          ) : null}
        </View>

        {error ? (
          <View testID={TEST_IDS.errorState}>
            <Text style={styles.error}>{error}</Text>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color="#F97316" />
          </View>
        ) : null}

        {loadedAt ? (
          <Text style={styles.meta}>Last refresh: {formatTimestamp(loadedAt)}</Text>
        ) : null}

        <View style={styles.listContainer} testID={TEST_IDS.issueListContainer}>
          <FlatList
            testID={TEST_IDS.issueList}
            data={issues}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <Text testID={TEST_IDS.emptyState} style={styles.empty}>
                {loadedAt
                  ? "No assigned issues in todo/in_progress/blocked."
                  : "No data loaded yet."}
              </Text>
            }
            renderItem={({ item }) => (
              <View style={styles.issueCard} testID={`${TEST_IDS.issueCardPrefix}${item.id}`}>
                <View style={styles.row}>
                  <Text style={styles.identifier}>{item.identifier}</Text>
                  <Text style={styles.badge}>{item.priority.toUpperCase()}</Text>
                </View>
                <Text style={styles.issueTitle}>{item.title}</Text>
                <Text style={styles.meta}>Status: {item.status}</Text>
                <Text style={styles.meta}>Updated: {formatTimestamp(item.updatedAt)}</Text>
              </View>
            )}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
  },
  header: {
    gap: 4,
  },
  title: {
    color: "#F8FAFC",
    fontSize: 28,
    fontWeight: "700",
  },
  subtitle: {
    color: "#CBD5E1",
    fontSize: 14,
  },
  config: {
    color: "#94A3B8",
    fontSize: 12,
  },
  authPanel: {
    backgroundColor: "#111827",
    borderColor: "#1F2937",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  inputLabel: {
    color: "#E2E8F0",
    fontSize: 13,
    fontWeight: "600",
  },
  input: {
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 10,
    color: "#F8FAFC",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#0B1220",
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  button: {
    backgroundColor: "#F97316",
    borderRadius: 10,
    paddingVertical: 11,
    flex: 1,
    alignItems: "center",
  },
  buttonSecondary: {
    backgroundColor: "#1F2937",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 11,
    flex: 1,
    alignItems: "center",
  },
  buttonGhost: {
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonText: {
    color: "#0B1220",
    fontWeight: "700",
  },
  buttonSecondaryText: {
    color: "#E2E8F0",
    fontWeight: "700",
  },
  buttonGhostText: {
    color: "#94A3B8",
    fontWeight: "600",
    fontSize: 12,
  },
  error: {
    color: "#FCA5A5",
    fontSize: 13,
  },
  loader: {
    alignItems: "center",
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    gap: 10,
    paddingBottom: 24,
  },
  issueCard: {
    backgroundColor: "#111827",
    borderColor: "#1F2937",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  identifier: {
    color: "#FDBA74",
    fontSize: 13,
    fontWeight: "700",
  },
  badge: {
    color: "#38BDF8",
    fontSize: 11,
    fontWeight: "700",
  },
  issueTitle: {
    color: "#F1F5F9",
    fontSize: 16,
    fontWeight: "600",
  },
  meta: {
    color: "#94A3B8",
    fontSize: 12,
  },
  empty: {
    color: "#94A3B8",
    fontSize: 13,
    textAlign: "center",
    paddingVertical: 16,
  },
});
