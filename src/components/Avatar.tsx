"use client";

import BoringAvatar from "boring-avatars";
import { UserDTO } from "@/lib/types";

const AVATAR_COLORS = ["#377dff", "#6ea8ff", "#c9dcff", "#ffb648", "#ff7a59"];

type Props = {
  user: Pick<UserDTO, "id" | "firstName" | "lastName" | "avatarUrl">;
  size?: number;
  className?: string;
};

export function Avatar({ user, size = 40, className }: Props) {
  const name = `${user.firstName} ${user.lastName}`.trim();

  if (user.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={name}
        className={`app-avatar ${className ?? ""}`}
        style={{ width: size, height: size, borderRadius: "50%" }}
      />
    );
  }

  return (
    <BoringAvatar
      name={user.id}
      variant="beam"
      colors={AVATAR_COLORS}
      size={size}
      aria-label={name}
      className={`app-avatar ${className ?? ""}`}
    />
  );
}
