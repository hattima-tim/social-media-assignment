"use client";

import { createContext, useContext } from "react";
import { UserDTO } from "@/lib/types";

const MeContext = createContext<UserDTO | null>(null);

export function MeProvider({ me, children }: { me: UserDTO; children: React.ReactNode }) {
  return <MeContext.Provider value={me}>{children}</MeContext.Provider>;
}

export function useMe(): UserDTO {
  const me = useContext(MeContext);
  if (!me) throw new Error("useMe must be used within MeProvider");
  return me;
}
