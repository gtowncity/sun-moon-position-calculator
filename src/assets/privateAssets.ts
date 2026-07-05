const twilightDiagramAssets = import.meta.glob("./twilight-diagram.png", {
  query: "?url",
  import: "default"
});

export async function getTwilightDiagramUrl(): Promise<string | undefined> {
  const loader = twilightDiagramAssets["./twilight-diagram.png"];
  return loader ? ((await loader()) as string) : undefined;
}

