// src/utils/registrarCambioLegajo.ts
import { db } from "../app/firebase-config";
import { collection, addDoc, Timestamp } from "firebase/firestore";

interface RegistroCambioInput {
  legajoId: string;
  accion: "modificado" | "eliminado" | "agregado";
  usuarioId: string;
  usuarioRol: string;
  tipoCambio: string;
  datosPrevios?: any;
  datosNuevos?: any;
}

export const registrarCambioLegajo = async (input: RegistroCambioInput) => {
  const {
    legajoId,
    accion,
    usuarioId,
    usuarioRol,
    tipoCambio,
    datosPrevios,
    datosNuevos,
  } = input;

  const historialRef = collection(db, "historialLegajos");

  // 🔧 Construimos el objeto sin campos undefined
  const data: any = {
    legajoId,
    accion,
    usuarioId,
    usuarioRol,
    tipoCambio,
    fecha: Timestamp.now(),
  };

  if (datosPrevios !== undefined) data.datosPrevios = datosPrevios;
  if (datosNuevos !== undefined) data.datosNuevos = datosNuevos;

  await addDoc(historialRef, data);
};
