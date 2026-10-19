// ConfettiBurst.tsx - falling confetti for celebration moments (level complete, result screens).
import React, { useEffect, useRef } from "react";
import { Animated, Dimensions, Easing, StyleSheet, View } from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Confetti colours (orange, pink, purple, blue, green, red) and shapes; PIECE_COUNT = how many pieces fall.
const COLORS = ["#F59E0B", "#EC4899", "#8B5CF6", "#2563EB", "#059669", "#EF4444"];
const SHAPES = ["circle", "square"] as const;
const PIECE_COUNT = 26;

// One confetti piece: start position, look, and animation timing.
type Piece = {
  x: number;
  color: string;
  shape: typeof SHAPES[number];
  size: number;
  delay: number;
  fallDuration: number;
  drift: number;
  spin: number;
};

// Creates PIECE_COUNT pieces with random position, size, colour, speed and spin.
function buildPieces(): Piece[] {
  return Array.from({ length: PIECE_COUNT }, () => ({
    x: Math.random() * SCREEN_WIDTH,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
    size: 7 + Math.random() * 6,
    delay: Math.random() * 250,
    fallDuration: 1800 + Math.random() * 900,
    drift: (Math.random() - 0.5) * 80,
    spin: (Math.random() - 0.5) * 720,
  }));
}

// Animates one piece falling down while drifting sideways, spinning and fading out.
function ConfettiPiece({ piece }: { piece: Piece }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: piece.fallDuration,
      delay: piece.delay,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [progress, piece.fallDuration, piece.delay]);

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [-40, 620] });
  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [0, piece.drift] });
  const rotate = progress.interpolate({ inputRange: [0, 1], outputRange: ["0deg", `${piece.spin}deg`] });
  const opacity = progress.interpolate({ inputRange: [0, 0.85, 1], outputRange: [1, 1, 0] });

  return (
    <Animated.View
      style={[
        styles.piece,
        {
          left: piece.x,
          width: piece.size,
          height: piece.size,
          backgroundColor: piece.color,
          borderRadius: piece.shape === "circle" ? piece.size / 2 : 2,
          opacity,
          transform: [{ translateY }, { translateX }, { rotate }],
        },
      ]}
    />
  );
}

/**
 * A one-shot confetti burst for celebration moments (level complete, etc).
 * Purely decorative — mount it once when the screen appears and let it play out.
 */
export default function ConfettiBurst() {
  const pieces = useRef(buildPieces()).current;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((piece, i) => (
        <ConfettiPiece key={i} piece={piece} />
      ))}
    </View>
  );
}

// Pieces are positioned absolutely at the top and animated downward.
const styles = StyleSheet.create({
  piece: { position: "absolute", top: 0 },
});
