import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, StyleSheet, View } from "react-native";
import { AppText } from "../components/AppText";
import { GlassPanel } from "../components/GlassPanel";
import { PrimaryButton } from "../components/PrimaryButton";
import {
  clearBlockedAuthors,
  unblockAuthor,
  useBlockedAuthors,
} from "../features/community/communityBlocks";
import { deleteMyCommunityData } from "../features/community/communityClient";
import { spacing } from "../theme/colors";

type Props = {
  pseudonym: string | null;
  onDeleted: () => Promise<void>;
};

/** Blocked authors and full deletion of the anonymous community identity. */
export function CommunityPrivacyPanel({ pseudonym, onDeleted }: Props) {
  const { t } = useTranslation();
  const blocked = useBlockedAuthors();
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = () => {
    Alert.alert(
      t("community.deleteDataTitle"),
      t("community.deleteDataBody"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: () => {
            setDeleting(true);
            void deleteMyCommunityData(pseudonym)
              .then(async (result) => {
                await clearBlockedAuthors();
                await onDeleted();
                Alert.alert(
                  t("community.deleteDataDoneTitle"),
                  t("community.deleteDataDoneBody", { count: result.recipes }),
                );
              })
              .catch((error: unknown) => {
                console.warn("community", "Community data deletion failed", error);
                Alert.alert(t("common.error"), t("community.deleteDataFailed"));
              })
              .finally(() => setDeleting(false));
          },
        },
      ],
    );
  };

  return (
    <GlassPanel style={styles.section}>
      <AppText variant="label">{t("community.blockedAuthorsTitle")}</AppText>
      {blocked.length ? (
        blocked.map((author) => (
          <View key={author.uid} style={styles.row}>
            <AppText style={styles.name} numberOfLines={1}>
              {author.name || t("community.anonymousAuthor")}
            </AppText>
            <PrimaryButton
              compact
              variant="ghost"
              label={t("community.unblockAuthor")}
              onPress={() => void unblockAuthor(author.uid)}
            />
          </View>
        ))
      ) : (
        <AppText muted variant="caption">
          {t("community.noBlockedAuthors")}
        </AppText>
      )}
      <AppText muted variant="caption">
        {t("community.deleteDataHelp")}
      </AppText>
      <PrimaryButton
        variant="danger-secondary"
        label={t("community.deleteDataAction")}
        disabled={deleting}
        onPress={confirmDelete}
      />
    </GlassPanel>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  name: { flex: 1 },
});
