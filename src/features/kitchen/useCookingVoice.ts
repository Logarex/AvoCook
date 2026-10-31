import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { cookingCommand, type CookingCommand } from "./voiceCommands";
import { getKitchenNative, startLocalVoice } from "./kitchenNative";
export function useCookingVoice(
  language: string,
  onCommand: (command: CookingCommand) => void,
) {
  const [available, setAvailable] = useState(false);
  const [listening, setListening] = useState(false);
  const [failed, setFailed] = useState(false);
  const wanted = useRef(false);
  const generation = useRef(0);
  const commandRef = useRef(onCommand);
  commandRef.current = onCommand;
  useEffect(() => {
    let mounted = true;
    const native = getKitchenNative();
    wanted.current = false;
    setAvailable(false);
    setListening(false);
    setFailed(false);
    void native
      ?.voiceAvailable(language)
      .then((result) => {
        if (mounted) setAvailable(result);
      })
      .catch(() => {
        if (mounted) setAvailable(false);
      });
    const stop = () => {
      generation.current += 1;
      wanted.current = false;
      if (mounted) setListening(false);
      void native?.stopVoice().catch(() => undefined);
    };
    const result = native?.addListener("voiceResult", (event) => {
      if (!wanted.current || !mounted) return;
      const command = cookingCommand(event.text ?? "");
      if (command === "stop") {
        stop();
        return;
      }
      if (command) commandRef.current(command);
      const revision = generation.current;
      void startLocalVoice(language)
        .then((started) => {
          if (!mounted || generation.current !== revision) {
            void native?.stopVoice().catch(() => undefined);
            return;
          }
          if (mounted && generation.current === revision && !started) {
            stop();
            setFailed(true);
          }
        })
        .catch(() => {
          if (mounted && generation.current === revision) {
            stop();
            setFailed(true);
          }
        });
    });
    const error = native?.addListener("voiceError", () => {
      if (mounted && wanted.current) {
        stop();
        setFailed(true);
      }
    });
    const appState = AppState.addEventListener("change", (state) => {
      // Permission dialogs make iOS inactive without backgrounding the app.
      if (state === "background") stop();
    });
    return () => {
      mounted = false;
      stop();
      result?.remove();
      error?.remove();
      appState.remove();
    };
  }, [language]);
  const toggle = async () => {
    generation.current += 1;
    const revision = generation.current;
    if (wanted.current) {
      wanted.current = false;
      setListening(false);
      await getKitchenNative()?.stopVoice();
      return;
    }
    wanted.current = true;
    setFailed(false);
    try {
      const started = await startLocalVoice(language);
      if (generation.current !== revision) {
        await getKitchenNative()?.stopVoice();
        return;
      }
      wanted.current = started;
      setListening(started);
      setFailed(!started);
    } catch {
      if (generation.current === revision) {
        wanted.current = false;
        setListening(false);
        setFailed(true);
      }
    }
  };
  return { available, listening, failed, toggle };
}
