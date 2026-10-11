import { Image, type ImageProps, type ImageSource } from "expo-image";
import React, { useState } from "react";

export function RecipeImage({ source, fallbackSource, children, ...props }: Omit<ImageProps, "source"> & {
  source: ImageSource | null;
  fallbackSource?: ImageSource | null;
  children: React.ReactNode;
}) {
  const [failed, setFailed] = useState<string[]>([]);
  const candidate = [source, fallbackSource].find((image) => image?.uri && !failed.includes(image.uri));
  if (!candidate?.uri) return <>{children}</>;
  return <Image {...props} source={candidate} onError={() => {
    setFailed((current) => [...current, candidate.uri!]);
  }} />;
}
