// types/vision.ts
export type VisionVertex = { x?: number; y?: number };
export type VisionAnnotation = {
  description: string;
  boundingPoly: { vertices: VisionVertex[] };
};
export type VisionResponse = {
  responses?: Array<{ textAnnotations?: VisionAnnotation[] }>;
};

export type Vertex = { x: number; y: number };
export type BoundingBox = {
  description: string;
  boundingPoly: { vertices: Vertex[] };
};
