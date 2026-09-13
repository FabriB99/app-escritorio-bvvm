import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';

import { db } from '../../app/firebase-config';

import { MdOutlineFireTruck } from 'react-icons/md';
import { TbLadder } from 'react-icons/tb';

import {
  FaShoppingBasket,
  FaAmbulance,
  FaTruck,
  FaSearch,
  FaExclamationTriangle,
} from 'react-icons/fa';

import { Users, GraduationCap, X } from 'lucide-react';

import Header from '../../components/Header';

import './VistaChoferes.css';

import {
  TipoUnidadChofer,
  HabilitacionesChofer,
  CATEGORIAS_CHOFER,
} from '../../types/unidades';


type Miembro = {
  id: string;
  nombre: string;
  apellido: string;
  ordenOperativo: number;
  activo: boolean;
};


type VencimientoCarnet = {
  id: string;
  tipo: string;
  nombre?: string;
  miembroId?: string;
  fecha?: unknown;

  // Sistema nuevo
  habilitacionesChofer?: HabilitacionesChofer;

  // Compatibilidad con registros viejos
  esChofer?: boolean;
  unidadesChofer?: string[];
};


type Chofer = {
  id: string;
  nombre: string;
  ordenOperativo: number;
  habilitaciones: HabilitacionesChofer;
  carnetVencido: boolean;
};


const unidades: Array<'Todos' | TipoUnidadChofer> = [
  'Todos',
  ...CATEGORIAS_CHOFER,
];


const unidadIconos: Record<TipoUnidadChofer, JSX.Element> = {
  Maestranza: <FaShoppingBasket size={14} />,
  Ambulancias: <FaAmbulance size={14} />,
  Livianas: <FaTruck size={14} />,
  Pesadas: <MdOutlineFireTruck size={15} />,
  Escalera: <TbLadder size={15} />,
};


const VistaChoferes: React.FC = () => {
  const [choferes, setChoferes] = useState<Chofer[]>([]);
  const [filtro, setFiltro] =
    useState<'Todos' | TipoUnidadChofer>('Todos');

  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    let miembrosData: Miembro[] = [];
    let vencimientosData: VencimientoCarnet[] = [];


    const actualizarChoferes = () => {
      const miembrosActivos = miembrosData.filter(
        (miembro) => miembro.activo !== false
      );

      const resultado: Chofer[] = [];


      vencimientosData.forEach((vencimiento) => {
        const tieneHabilitacionesNuevas =
          vencimiento.habilitacionesChofer &&
          Object.keys(vencimiento.habilitacionesChofer).length > 0;

        const esRegistroViejo = vencimiento.esChofer === true;


        if (!tieneHabilitacionesNuevas && !esRegistroViejo) {
          return;
        }


        let miembro: Miembro | undefined;


        if (vencimiento.miembroId) {
          miembro = miembrosActivos.find(
            (m) => m.id === vencimiento.miembroId
          );
        }


        if (!miembro && vencimiento.nombre) {
          const nombreVencimiento =
            vencimiento.nombre.trim().toLowerCase();

          miembro = miembrosActivos.find((m) => {
            const nombreCompleto =
              `${m.apellido}, ${m.nombre}`.trim().toLowerCase();

            const nombreAntiguo =
              `${m.nombre} ${m.apellido}`.trim().toLowerCase();

            return (
              nombreCompleto === nombreVencimiento ||
              nombreAntiguo === nombreVencimiento
            );
          });
        }


        let habilitaciones: HabilitacionesChofer = {};


        if (
          vencimiento.habilitacionesChofer &&
          Object.keys(vencimiento.habilitacionesChofer).length > 0
        ) {
          habilitaciones = {
            ...vencimiento.habilitacionesChofer,
          };
        } else if (
          vencimiento.esChofer &&
          Array.isArray(vencimiento.unidadesChofer)
        ) {
          vencimiento.unidadesChofer.forEach((unidad) => {
            if (
              CATEGORIAS_CHOFER.includes(
                unidad as TipoUnidadChofer
              )
            ) {
              habilitaciones[unidad as TipoUnidadChofer] =
                'habilitado';
            }
          });
        }


        const idChofer = miembro?.id || vencimiento.id;

        const nombreChofer = miembro
          ? `${miembro.apellido}, ${miembro.nombre}`
          : vencimiento.nombre || 'Sin nombre';

        const ordenOperativo =
          miembro?.ordenOperativo ?? 0;


        const existente = resultado.find(
          (chofer) => chofer.id === idChofer
        );

        const carnetVencido =
          verificarCarnetVencido(vencimiento.fecha);


        if (existente) {
          existente.habilitaciones = {
            ...existente.habilitaciones,
            ...habilitaciones,
          };

          existente.carnetVencido =
            existente.carnetVencido || carnetVencido;
        } else {
          resultado.push({
            id: idChofer,
            nombre: nombreChofer,
            ordenOperativo,
            habilitaciones,
            carnetVencido,
          });
        }
      });


      setChoferes(resultado);
      setLoading(false);
    };


    const unsubscribeMiembros = onSnapshot(
      collection(db, 'miembros'),

      (snapshot) => {
        miembrosData = snapshot.docs.map((doc) => {
          const d = doc.data();

          return {
            id: doc.id,
            nombre: d.nombre || '',
            apellido: d.apellido || '',
            ordenOperativo: Number(d.ordenOperativo) || 0,
            activo: d.activo !== false,
          };
        });

        actualizarChoferes();
      },

      (error) => {
        console.error('Error cargando miembros:', error);
        setLoading(false);
      }
    );


    const unsubscribeVencimientos = onSnapshot(
      collection(db, 'vencimientos'),

      (snapshot) => {
        vencimientosData = snapshot.docs.map((doc) => {
          const d = doc.data();

          return {
            id: doc.id,
            tipo: d.tipo || '',
            nombre: d.nombre || '',
            miembroId: d.miembroId || '',
            fecha: d.fecha,
            habilitacionesChofer:
              d.habilitacionesChofer || undefined,
            esChofer: d.esChofer || false,
            unidadesChofer: Array.isArray(d.unidadesChofer)
              ? d.unidadesChofer
              : [],
          };
        });

        actualizarChoferes();
      },

      (error) => {
        console.error(
          'Error cargando vencimientos:',
          error
        );

        setLoading(false);
      }
    );


    return () => {
      unsubscribeMiembros();
      unsubscribeVencimientos();
    };
  }, []);


  const filtrados = choferes
    .filter((chofer) =>
      filtro === 'Todos'
        ? true
        : Boolean(chofer.habilitaciones[filtro])
    )
    .filter((chofer) =>
      chofer.nombre
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    )
    .sort((a, b) =>
      a.nombre.localeCompare(
        b.nombre,
        'es',
        { sensitivity: 'base' }
      )
    );


  const resumen = useMemo(() => {
    const conCarnetVencido =
      choferes.filter((c) => c.carnetVencido).length;

    const enAprendizaje =
      choferes.filter((c) =>
        Object.values(c.habilitaciones).includes(
          'aprendizaje'
        )
      ).length;

    return {
      total: choferes.length,
      conCarnetVencido,
      enAprendizaje,
    };
  }, [choferes]);


  return (
    <div className="vista-choferes">

      <Header title="Choferes Habilitados" />

      {/* ======================================================
          RESUMEN
          ====================================================== */}

      {!loading && (
        <section className="vista-choferes-resumen">

          <div className="resumen-item">
            <div className="resumen-icon resumen-icon-total">
              <Users size={17} />
            </div>

            <div>
              <strong>{resumen.total}</strong>
              <span>Choferes registrados</span>
            </div>
          </div>


          <div className="resumen-item">
            <div className="resumen-icon resumen-icon-aprendizaje">
              <GraduationCap size={17} />
            </div>

            <div>
              <strong>{resumen.enAprendizaje}</strong>
              <span>En aprendizaje</span>
            </div>
          </div>


          <div className="resumen-item">
            <div className="resumen-icon resumen-icon-vencido">
              <FaExclamationTriangle size={14} />
            </div>

            <div>
              <strong>{resumen.conCarnetVencido}</strong>
              <span>Con carnet vencido</span>
            </div>
          </div>

        </section>
      )}


      {/* ======================================================
          TABS + BUSCADOR
          ====================================================== */}

      <div className="vista-choferes-tabs">

        <div className="tabs-buttons">

          {unidades.map((tipo) => (
            <button
              key={tipo}
              className={filtro === tipo ? 'activo' : ''}
              onClick={() => setFiltro(tipo)}
            >
              {tipo}
            </button>
          ))}

        </div>


        <div className="buscador-top">

          <div className="buscador-container">

            <FaSearch
              size={15}
              className="icono-lupa"
            />

            <input
              type="text"
              placeholder="Buscar por nombre..."
              value={searchTerm}
              onChange={(e) =>
                setSearchTerm(e.target.value)
              }
            />

            {searchTerm && (
              <button
                type="button"
                className="buscador-limpiar"
                onClick={() => setSearchTerm('')}
              >
                <X size={15} />
              </button>
            )}

          </div>

        </div>

      </div>


      {/* ======================================================
          TABLA
          ====================================================== */}

      {loading ? (

        <p className="vista-choferes-loading">
          Cargando choferes...
        </p>

      ) : (

        <div className="vista-choferes-tabla-wrapper">

          <table className="vista-choferes-tabla">

            <thead>
              <tr>
                <th>Chofer</th>
                <th>Unidades habilitadas</th>
              </tr>
            </thead>


            <tbody>

              {filtrados.length > 0 ? (

                filtrados.map((chofer) => (

                  <tr key={chofer.id}>
                    <td className="nombre-chofer">
                      <div className="nombre-chofer-linea">
                        <strong>{chofer.nombre}</strong>

                        {chofer.carnetVencido && (
                          <span className="carnet-vencido">
                            <FaExclamationTriangle size={10} />
                            Carnet vencido
                          </span>
                        )}
                      </div>

                      <small>Nº {chofer.ordenOperativo}</small>
                    </td>


                    <td className="unidades-celda">

                      <div className="unidades-chips">

                        {CATEGORIAS_CHOFER.map(
                          (unidad) => {

                            const estado =
                              chofer.habilitaciones[
                                unidad
                              ];

                            if (!estado) {
                              return null;
                            }


                            const enAprendizaje =
                              estado === 'aprendizaje';


                            return (
                              <span
                                key={unidad}
                                className={`
                                  categoria-chip
                                  categoria-chip-${unidad.toLowerCase()}
                                  ${enAprendizaje
                                    ? 'en-aprendizaje'
                                    : ''}
                                `}
                              >

                                {unidadIconos[unidad]}

                                <span className="categoria-chip-texto">
                                  {unidad}
                                </span>

                                {enAprendizaje && (
                                  <span className="categoria-chip-sufijo">
                                    · aprendizaje
                                  </span>
                                )}

                              </span>
                            );
                          }
                        )}


                        {!Object.keys(
                          chofer.habilitaciones
                        ).length && (

                          <span className="sin-unidades">
                            Sin unidades habilitadas
                          </span>

                        )}

                      </div>

                    </td>

                  </tr>

                ))

              ) : (

                <tr>

                  <td
                    colSpan={2}
                    className="sin-resultados"
                  >
                    No hay choferes para esta categoría.
                  </td>

                </tr>

              )}

            </tbody>

          </table>

        </div>

      )}

    </div>
  );
};


/* ============================================================
   VERIFICAR CARNET VENCIDO
   ============================================================ */

const verificarCarnetVencido = (
  fecha: unknown
): boolean => {

  if (!fecha) {
    return false;
  }


  try {

    let fechaDate: Date;


    if (
      typeof fecha === 'object' &&
      fecha !== null &&
      'toDate' in fecha &&
      typeof (
        fecha as {
          toDate: () => Date;
        }
      ).toDate === 'function'
    ) {

      fechaDate = (
        fecha as {
          toDate: () => Date;
        }
      ).toDate();

    } else if (fecha instanceof Date) {

      fechaDate = fecha;

    } else if (typeof fecha === 'string') {

      fechaDate = new Date(
        `${fecha}T00:00:00`
      );

    } else {

      return false;

    }


    const hoy = new Date();

    hoy.setHours(0, 0, 0, 0);

    fechaDate.setHours(0, 0, 0, 0);


    return fechaDate < hoy;

  } catch {

    return false;

  }
};


export default VistaChoferes;