import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import PulseLoader from "react-spinners/PulseLoader";
import {
  getTickets,
  startLoadingTickets,
  finishLoadingTickets,
} from "../../store/actions/getTickets";
import Ticket from "../Ticket/Ticket";
import styles from "./TicketsList.module.scss";

export default function TicketsList() {
  const dispatch = useDispatch();
  const tickets = useSelector((state) => state.tickets.ticketsData);
  const visibleTickets = useSelector((state) => state.tickets.visibleTickets);
  const checkboxes = useSelector((state) => state.checkboxes);
  const filterTickets = useSelector((state) => state.tickets.filterTickets);
  const allTicketsLoaded = useSelector(
    (state) => state.tickets.allTicketsLoaded
  );
  const areAllCheckboxesFalse = Object.values(checkboxes).every(
    (value) => !value
  );
  const [error, setError] = useState(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (isOffline) return;

    const fetchTickets = async () => {
      dispatch(startLoadingTickets());
      try {
        await dispatch(getTickets());
        dispatch(finishLoadingTickets());
      } catch (err) {
        setError("Не удалось загрузить билеты. Проверьте подключение к сети.");
      }
    };

    fetchTickets();
  }, [dispatch, isOffline]);

  useEffect(() => {
    dispatch(startLoadingTickets());
    dispatch(getTickets()).then(() => dispatch(finishLoadingTickets()));
  }, [dispatch]);

  const filteredTickets = tickets.filter((ticket) =>
    ticket.segments.every((segment) => {
      const stopCount = segment.stops.length.toString();
      const checkboxesMap = {
        0: checkboxes.noStops,
        1: checkboxes.oneStop,
        2: checkboxes.twoStops,
        3: checkboxes.threeStops,
      };

      const result = checkboxesMap[stopCount] ?? false;
      return result;
    })
  );
  const sortTickets = (ticketsToSort, filterType) => {
    switch (filterType) {
      case "cheapest":
        return ticketsToSort.slice().sort((a, b) => a.price - b.price);
      case "fastest":
        return ticketsToSort.slice().sort((a, b) => {
          const durationA = a.segments.reduce(
            (acc, segment) => acc + segment.duration,
            0
          );
          const durationB = b.segments.reduce(
            (acc, segment) => acc + segment.duration,
            0
          );
          return durationA - durationB;
        });
      case "optimal":
        return ticketsToSort.slice().sort((a, b) => {
          const durationA = a.segments.reduce(
            (acc, segment) => acc + segment.duration,
            0
          );
          const durationB = b.segments.reduce(
            (acc, segment) => acc + segment.duration,
            0
          );
          const scoreA = a.price / durationA;
          const scoreB = b.price / durationB;
          return scoreA - scoreB;
        });
      default:
        return ticketsToSort;
    }
  };

  const sortedAndFilteredTickets = sortTickets(filteredTickets, filterTickets);

  if (isOffline) {
    return <p className={styles.error}>Проверьте подключение к сети.</p>;
  }

  if (error) {
    return <p className={styles.error}>{error}</p>;
  }

  if (areAllCheckboxesFalse && filteredTickets.length === 0) {
    return (
      <p className={styles.noResults}>
        Рейсов, подходящих под заданные фильтры, не найдено
      </p>
    );
  }

  return (
    <>
      {!allTicketsLoaded && (
        <>
          <div className={styles.loading}>Загрузка всех билетов...</div>
          <div className={styles.loaderWrapper}>
            <PulseLoader color="#2196F3" margin={10} size={17} />
          </div>
        </>
      )}
      {allTicketsLoaded === "download complete" && (
        <div className={styles.ticketsLoaded}>
          <div className={styles.ticketsLoadedText}>Все билеты загружены</div>
        </div>
      )}
      {sortedAndFilteredTickets.slice(0, visibleTickets).map((ticket) => (
        <Ticket
          key={`${ticket.price}-${ticket.carrier}-${ticket.departureTime}`}
          price={ticket.price}
          carrier={ticket.carrier}
          segments={ticket.segments}
        />
      ))}
    </>
  );
}
