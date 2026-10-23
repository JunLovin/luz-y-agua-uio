import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

/** True when the phone asks for less motion: animations then jump straight to their end. */
export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduce);
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduce,
    );
    return () => subscription.remove();
  }, []);
  return reduce;
}
