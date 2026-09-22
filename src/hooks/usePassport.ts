import { useCallback, useState } from "react";
import { addStamp, loadPassport, resetPassport, savePassport } from "../lib/passport";

export function usePassport() {
  const [passport, setPassport] = useState(loadPassport);

  const collectStamp = useCallback((stampId: string) => {
    setPassport((current) => {
      const result = addStamp(current.state, stampId);
      if (!result.added) {
        return current;
      }

      return {
        state: result.state,
        isPersistent: savePassport(result.state),
      };
    });
  }, []);

  const clearPassport = useCallback(() => {
    setPassport(resetPassport());
  }, []);

  return {
    ...passport,
    collectStamp,
    resetPassport: clearPassport,
  };
}
