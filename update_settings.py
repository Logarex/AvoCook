import re

with open("src/screens/SettingsScreen.tsx", "r") as f:
    content = f.read()

# Define the new JSX content
new_jsx = """  return (
    <Screen showScrollTop={false}>
      <View style={styles.toolbar}>
        <IconButton
          icon={ArrowLeft}
          label={t("common.back")}
          onPress={() => navigation.goBack()}
        />
        <AppText variant="subtitle">{t("settings.title")}</AppText>
        <View style={styles.toolbarSpacer} />
      </View>

      {message ? (
        <AppText accessibilityLiveRegion="polite" style={{ color: colors.success, paddingHorizontal: spacing.md, paddingBottom: spacing.md, textAlign: "center" }}>
          {message}
        </AppText>
      ) : null}

      <GlassPanel style={styles.section}>
        <View style={styles.sectionHeader}>
          <Smartphone color={colors.primary} size={22} />
          <AppText variant="label">{t("settings.appearance")}</AppText>
        </View>

        <SegmentedControl<ThemeMode>
          value={mode}
          onChange={(value) => void setMode(value)}
          options={[
            { label: t("settings.system"), value: "system" },
            { label: t("settings.light"), value: "light" },
            { label: t("settings.dark"), value: "dark" }
          ]}
        />
        <View style={styles.divider} />

        <LanguagePicker
          value={language}
          onChange={(value) => void setLanguage(value)}
        />
        <View style={styles.divider} />

        <View style={styles.rowSectionInner}>
          <View style={styles.rowText}>
            <AppText variant="label">{t("settings.keepAwake")}</AppText>
          </View>
          <Switch
            accessibilityLabel={t("settings.keepAwake")}
            accessibilityRole="switch"
            accessibilityState={{ checked: keepScreenAwake }}
            onValueChange={(value) => void setKeepScreenAwake(value)}
            thumbColor={Platform.OS === "android" ? (keepScreenAwake ? colors.primary : colors.textMuted) : undefined}
            trackColor={{ false: colors.border, true: Platform.OS === "android" ? colors.chip : colors.primary }}
            value={keepScreenAwake}
          />
        </View>
        <View style={styles.divider} />

        <View style={styles.rowSectionInner}>
          <View style={styles.rowText}>
            <AppText variant="label">{t("settings.showDefaultCategories")}</AppText>
            <AppText muted variant="caption">
              {t("settings.showDefaultCategoriesDescription")}
            </AppText>
          </View>
          <Switch
            accessibilityLabel={t("settings.showDefaultCategories")}
            accessibilityRole="switch"
            accessibilityState={{ checked: showDefaultCategories ?? isLocalMode }}
            onValueChange={(value) => void setShowDefaultCategories(value)}
            thumbColor={Platform.OS === "android" ? ((showDefaultCategories ?? isLocalMode) ? colors.primary : colors.textMuted) : undefined}
            trackColor={{ false: colors.border, true: Platform.OS === "android" ? colors.chip : colors.primary }}
            value={showDefaultCategories ?? isLocalMode}
          />
        </View>
      </GlassPanel>

      <GlassPanel style={styles.section}>
        <View style={styles.sectionHeader}>
          <Globe color={colors.primary} size={22} />
          <AppText variant="label">{t("settings.server", "Serveur & Synchronisation")}</AppText>
        </View>

        <View style={styles.connectionHeader}>
          <View style={styles.connectionTitleGroup}>
            <ShieldCheck color={colors.primary} size={22} />
            <AppText variant="label">
              {isLocalMode ? t("settings.localMode") : t("auth.server")}
            </AppText>
          </View>
          
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: isLocalMode ? colors.border : colors.chip }
            ]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isLocalMode ? colors.warning : colors.success }
              ]}
            />
            <AppText
              variant="caption"
              style={[
                styles.statusText,
                { color: isLocalMode ? colors.warning : colors.primary }
              ]}
            >
              {isLocalMode ? t("common.offline") : t("common.online")}
            </AppText>
          </View>
        </View>

        <View style={styles.detailsContainer}>
          {!isLocalMode && credentials?.serverUrl ? (
            <>
              <View style={styles.detailRow}>
                <View style={[styles.detailIconWrapper, { backgroundColor: colors.chip }]}>
                  <Globe color={colors.primary} size={16} />
                </View>
                <View style={styles.detailContent}>
                  <AppText muted variant="caption">
                    {t("auth.server")}
                  </AppText>
                  <AppText style={styles.detailValue} numberOfLines={1} ellipsizeMode="tail">
                    {credentials.serverUrl}
                  </AppText>
                </View>
              </View>
              <View style={[styles.detailDivider, { backgroundColor: colors.border }]} />
            </>
          ) : null}

          {!isLocalMode && credentials?.username ? (
            <>
              <View style={styles.detailRow}>
                <View style={[styles.detailIconWrapper, { backgroundColor: colors.chip }]}>
                  <User color={colors.primary} size={16} />
                </View>
                <View style={styles.detailContent}>
                  <AppText muted variant="caption">
                    {t("auth.username")}
                  </AppText>
                  <AppText style={styles.detailValue} numberOfLines={1}>
                    {credentials.username}
                  </AppText>
                </View>
              </View>
              <View style={[styles.detailDivider, { backgroundColor: colors.border }]} />
            </>
          ) : null}

          <View style={styles.detailRow}>
            <View style={[styles.detailIconWrapper, { backgroundColor: colors.chip }]}>
              <BookOpen color={colors.primary} size={16} />
            </View>
            <View style={styles.detailContent}>
              <AppText muted variant="caption">
                {t("recipes.title")}
              </AppText>
              <AppText style={styles.detailValue}>
                {t(
                  recipes.length <= 1
                    ? "recipes.loadedRecipes_one"
                    : "recipes.loadedRecipes_other",
                  { count: recipes.length }
                )}
              </AppText>
            </View>
          </View>
        </View>

        <View
          style={[
            styles.noticeBanner,
            { backgroundColor: isLocalMode ? "rgba(184, 106, 29, 0.08)" : colors.chip }
          ]}
        >
          {isLocalMode ? (
            <Info color={colors.warning} size={16} />
          ) : (
            <Lock color={colors.primary} size={16} />
          )}
          <AppText muted variant="caption" style={styles.noticeText}>
            {isLocalMode ? t("settings.localNotice") : t("settings.secureStore")}
          </AppText>
        </View>

        <View style={styles.divider} />

        <View style={styles.rowSectionInner}>
          <View style={styles.rowText}>
            <AppText variant="label">{t("settings.keepRecipesLocal")}</AppText>
          </View>
          <Switch
            accessibilityLabel={t("settings.keepRecipesLocal")}
            accessibilityRole="switch"
            accessibilityState={{
              checked: keepRecipesLocal || isLocalMode,
              disabled: isLocalMode
            }}
            disabled={isLocalMode}
            onValueChange={(value) => void setKeepRecipesLocal(value)}
            thumbColor={Platform.OS === "android" ? (keepRecipesLocal || isLocalMode ? colors.primary : colors.textMuted) : undefined}
            trackColor={{ false: colors.border, true: Platform.OS === "android" ? colors.chip : colors.primary }}
            value={keepRecipesLocal || isLocalMode}
          />
        </View>

        <View style={styles.divider} />
        <View style={{ marginBottom: 12 }}>
          <AppText variant="label">{t("settings.duplicates")}</AppText>
        </View>
        <AppText muted variant="caption" style={{ marginBottom: 12 }}>
          {t(
            isLocalMode
              ? "settings.duplicatesLocalBody"
              : "settings.duplicatesNextcloudBody"
          )}
        </AppText>
        <PrimaryButton
          disabled={duplicateAction}
          icon={Database}
          label={
            duplicateAction
              ? t("common.loading")
              : t("settings.checkDuplicates")
          }
          onPress={() => void handleCheckDuplicates()}
          variant="ghost"
        />

        {!isLocalMode && credentials ? (
          <>
            <View style={styles.divider} />
            <PrimaryButton
              icon={RefreshCw}
              label={t("settings.reindex")}
              onPress={() => void handleReindex()}
              variant="ghost"
            />
          </>
        ) : null}
      </GlassPanel>

      <GlassPanel style={styles.section}>
        <View style={styles.sectionHeader}>
          <Database color={colors.primary} size={22} />
          <AppText variant="label">{t("settings.dataBackup")}</AppText>
        </View>

        <View style={styles.rowSectionInner}>
          <View style={styles.rowText}>
            <AppText variant="label">{t("settings.enableBackupReminders")}</AppText>
          </View>
          <Switch
            accessibilityLabel={t("settings.enableBackupReminders")}
            accessibilityRole="switch"
            accessibilityState={{ checked: enableBackupReminders }}
            onValueChange={(value) => void setEnableBackupReminders(value)}
            thumbColor={Platform.OS === "android" ? (enableBackupReminders ? colors.primary : colors.textMuted) : undefined}
            trackColor={{ false: colors.border, true: Platform.OS === "android" ? colors.chip : colors.primary }}
            value={enableBackupReminders}
          />
        </View>

        <View style={styles.divider} />

        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Bell color={colors.primary} size={22} />
          <AppText variant="label">{t("settings.notifications")}</AppText>
        </View>
        <PrimaryButton
          disabled={notificationState === "unavailable"}
          label={
            notificationState === "ready"
              ? t("settings.notificationsEnabled")
              : t("settings.notificationsDisabled")
          }
          onPress={() => void handleToggleNotifications()}
          variant={notificationState === "ready" ? "primary" : "ghost"}
        />

        <View style={styles.divider} />

        {isLocalMode ? (
          <View style={[styles.warningRow, { marginBottom: 12 }]}>
            <AlertTriangle color={colors.danger} size={20} />
            <AppText style={styles.warningText}>
              {t("settings.localDeleteWarning")}
            </AppText>
          </View>
        ) : null}
        <AppText muted variant="caption" style={{ marginBottom: 16 }}>
          {t(
            isLocalMode
              ? "settings.dataBackupLocalBody"
              : "settings.dataBackupNextcloudBody"
          )}
        </AppText>
        <View style={styles.backupActions}>
          <PrimaryButton
            disabled={backupAction !== null}
            icon={Download}
            label={
              backupAction === "export"
                ? t("common.loading")
                : t("settings.exportBackup")
            }
            onPress={() => void handleExportBackup()}
            style={styles.backupButton}
            variant="ghost"
          />
          <PrimaryButton
            disabled={backupAction !== null}
            icon={Upload}
            label={
              backupAction === "import"
                ? t("common.loading")
                : t("settings.importBackup")
            }
            onPress={() => handleImportBackup()}
            style={styles.backupButton}
            variant="ghost"
          />
        </View>
      </GlassPanel>

      <GlassPanel style={styles.section}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setShowAdvanced((v) => !v)}
          style={showAdvanced ? styles.advancedHeader : [styles.advancedHeader, { marginBottom: 0 }]}
        >
          <View style={[styles.sectionHeader, { marginBottom: 0 }]}>
            <Bot color={colors.primary} size={22} />
            <AppText variant="label">{t("settings.advanced")}</AppText>
          </View>
          <ChevronDown
            color={colors.textMuted}
            size={18}
            style={{ transform: [{ rotate: showAdvanced ? "180deg" : "0deg" }] }}
          />
        </Pressable>

        {showAdvanced ? (
          <View style={{ marginTop: 16 }}>
            <AppText muted variant="caption" style={{ marginBottom: 16 }}>
              {t("settings.llmHint")}
            </AppText>

            <AppText variant="label">{t("settings.llmProvider")}</AppText>
            <View style={styles.providerGrid}>
              {LLM_PROVIDERS.map((preset) => {
                const selected = currentLlm.providerId === preset.id;
                return (
                  <Pressable
                    accessibilityLabel={preset.label}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    key={preset.id}
                    onPress={() => handleSelectProvider(preset.id)}
                    style={[
                      styles.providerChip,
                      {
                        backgroundColor: selected ? colors.primary : colors.input,
                        borderColor: selected ? colors.primary : colors.border
                      }
                    ]}
                  >
                    <AppText
                      variant="caption"
                      style={{ color: selected ? colors.textInverted : colors.text }}
                    >
                      {preset.label}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>

            <TextField
              autoCapitalize="none"
              autoCorrect={false}
              label={t("settings.llmApiKey")}
              onBlur={handleLlmFieldBlur}
              onChangeText={(v) => handleLlmFieldChange("apiKey", v)}
              placeholder={t("settings.llmApiKeyPlaceholder")}
              secureTextEntry={!showApiKey}
              value={currentLlm.apiKey}
              rightElement={
                <Pressable
                  accessibilityLabel={showApiKey ? t("auth.hidePassword") : t("auth.showPassword")}
                  onPress={() => setShowApiKey((v) => !v)}
                  hitSlop={8}
                >
                  {showApiKey
                    ? <EyeOff color={colors.textMuted} size={20} />
                    : <Eye color={colors.textMuted} size={20} />}
                </Pressable>
              }
            />

            {currentLlm.providerId === "custom" ? (
              <>
                <TextField
                  autoCapitalize="none"
                  autoCorrect={false}
                  label={t("settings.llmModel")}
                  onBlur={handleLlmFieldBlur}
                  onChangeText={(v) => handleLlmFieldChange("model", v)}
                  placeholder={t("settings.llmModelPlaceholder")}
                  value={currentLlm.model}
                />
                <TextField
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  label={t("settings.llmBaseUrl")}
                  onBlur={handleLlmFieldBlur}
                  onChangeText={(v) => handleLlmFieldChange("baseUrl", v)}
                  placeholder="https://api.example.com/v1"
                  value={currentLlm.baseUrl}
                />
              </>
            ) : null}

            <PrimaryButton
              icon={Save}
              label={t("common.save", "Save")}
              onPress={handleSaveLlmSettings}
              disabled={!llmDraft && llmSettings.apiKey === currentLlm.apiKey && llmSettings.model === currentLlm.model && llmSettings.baseUrl === currentLlm.baseUrl && llmSettings.providerId === currentLlm.providerId}
            />

            <PrimaryButton
              disabled={!currentLlm.apiKey.trim() || fetchingModels}
              icon={RefreshCw}
              label={
                fetchingModels
                  ? t("common.loading")
                  : t("settings.llmFetchModels")
              }
              onPress={() => void handleFetchModels()}
              variant="ghost"
              style={{ marginTop: 8 }}
            />

            {fetchModelsError ? (
              <AppText variant="caption" style={{ color: colors.danger, marginTop: 8 }}>
                {fetchModelsError}
              </AppText>
            ) : null}

            {availableModels && availableModels.length > 0 ? (
              <>
                <AppText variant="label" style={{ marginTop: 16 }}>{t("settings.llmPickModel")}</AppText>
                <ScrollView
                  style={styles.modelListScroll}
                  contentContainerStyle={styles.modelListContent}
                  showsVerticalScrollIndicator
                  nestedScrollEnabled
                >
                  {availableModels.map((id) => {
                    const selected = currentLlm.model === id;
                    return (
                      <Pressable
                        accessibilityLabel={id}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        key={id}
                        onPress={() => handlePickModel(id)}
                        style={[
                          styles.modelChip,
                          {
                            backgroundColor: selected ? colors.primary : colors.input,
                            borderColor: selected ? colors.primary : colors.border
                          }
                        ]}
                      >
                        <AppText
                          variant="caption"
                          style={{ color: selected ? colors.textInverted : colors.text }}
                          numberOfLines={1}
                        >
                          {id}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </>
            ) : null}

            <PrimaryButton
              label={t("settings.closeAdvanced")}
              onPress={() => setShowAdvanced(false)}
              variant="ghost"
              style={{ marginTop: 16 }}
            />
          </View>
        ) : null}
      </GlassPanel>

      <GlassPanel style={styles.section}>
        <View style={styles.sectionHeader}>
          <Info color={colors.primary} size={22} />
          <AppText variant="label">{t("support.email", "Support & Informations")}</AppText>
        </View>

        <View style={{ gap: 8 }}>
          <PrimaryButton
            icon={Sparkles}
            label={t("update.settingsButton", "Quoi de neuf dans cette version")}
            onPress={() => navigation.navigate("Update")}
            variant="ghost"
          />
          <PrimaryButton
            icon={BookOpen}
            label={t("settings.replayIntro")}
            onPress={() => {
              void resetOnboarding().then(() => {
                navigation.navigate("Onboarding");
              });
            }}
            variant="ghost"
          />
          <PrimaryButton
            icon={FileText}
            label={t("settings.openLogs")}
            onPress={() => navigation.navigate("DiagnosticsLogs")}
            variant="ghost"
          />
          <PrimaryButton
            icon={Info}
            label={t("settings.openPrivacy")}
            onPress={() => navigation.navigate("Privacy")}
            variant="ghost"
          />
          <PrimaryButton
            icon={Bug}
            label={t("support.github", "Open Issue")}
            onPress={openGithubIssue}
            variant="ghost"
          />
          <PrimaryButton
            icon={Mail}
            label={t("support.email", "Contact Us")}
            onPress={contactByEmail}
            variant="ghost"
          />
        </View>
      </GlassPanel>

      <PrimaryButton
        icon={LogOut}
        label={t("common.logout")}
        onPress={() => void handleLogout()}
        variant="danger"
        style={{ marginTop: 16, marginBottom: 32 }}
      />
    </Screen>
  );"""

# The return starts exactly at "  return (" and goes to "    </Screen>\n  );"
pattern = re.compile(r"  return \(\n    <Screen showScrollTop=\{false\}>.*?</Screen>\n  \);", re.DOTALL)
new_content = pattern.sub(new_jsx, content)

with open("src/screens/SettingsScreen.tsx", "w") as f:
    f.write(new_content)
