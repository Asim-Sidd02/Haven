"use client";

import { useEffect, useState } from "react";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

/** Live subscription to a whole collection (admin has full read access). */
export function useCollection<T>(path: string) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsub = () => {};
    try {
      unsub = onSnapshot(
        collection(db(), path),
        (snap) => {
          setData(snap.docs.map((d) => ({ ...d.data(), id: d.id }) as T));
          setLoading(false);
        },
        (e) => {
          setError(e.message);
          setLoading(false);
        },
      );
    } catch (e) {
      setError((e as Error).message);
      setLoading(false);
    }
    return () => unsub();
  }, [path]);

  return { data, loading, error };
}

export function useDoc<T>(path: string, id: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsub = () => {};
    try {
      unsub = onSnapshot(
        doc(db(), path, id),
        (snap) => {
          setData(snap.exists() ? (snap.data() as T) : null);
          setLoading(false);
        },
        () => setLoading(false),
      );
    } catch {
      setLoading(false);
    }
    return () => unsub();
  }, [path, id]);

  return { data, loading };
}
