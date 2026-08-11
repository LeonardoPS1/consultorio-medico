'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 *
 */
export function TestA() {
  const [a, setA] = useState(0);
  const fetchA = useCallback(async () => {
    const res = await fetch('/x');
    setA(1);
    void res;
  }, []);
  useEffect(() => {
    fetchA();
  }, [fetchA]);
  return <div>{a}</div>;
}

/**
 *
 */
export function TestB() {
  const [a, setA] = useState(0);
  useEffect(() => {
    let c = false;
    (async () => {
      const res = await fetch('/x');
      if (!c) setA(1);
      void res;
    })();
    return () => {
      c = true;
    };
  }, []);
  return <div>{a}</div>;
}

/**
 *
 */
export function TestC() {
  const [a, setA] = useState(0);
  useEffect(() => {
    void (async () => {
      const res = await fetch('/x');
      setA(1);
      void res;
    })();
  }, []);
  return <div>{a}</div>;
}

/**
 *
 */
export function TestD() {
  const [a, setA] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setA(1), 0);
    return () => clearTimeout(t);
  }, []);
  return <div>{a}</div>;
}

/**
 *
 */
export function TestE() {
  const [a, setA] = useState(0);
  useEffect(() => {
    setA(1);
  }, []);
  return <div>{a}</div>;
}
