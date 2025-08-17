"use client";
import { useState } from "react";
import GimPlayGate from "@/components/GimPlayGate";
import GimPlayPet from "@/components/GimPlayPet";

export default function Client() {
  const [character, setCharacter] = useState<"char01"|"char02"|"char03"|"char04"|"char05"|"char06"|null>(null);
  const [name, setName] = useState<string>("");
  return (
    <>
      {!character && <GimPlayGate onReady={(c,n)=>{setCharacter(c); setName(n);}} />}
      {character && <GimPlayPet selectedCharacter={character} initialName={name} />}
    </>
  );
}
