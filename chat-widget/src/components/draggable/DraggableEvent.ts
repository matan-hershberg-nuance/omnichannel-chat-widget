import DraggableEventNames from "./DraggableEventNames";

export default interface DraggableEvent {
    channel: string;
    eventName: DraggableEventNames | string;
    offset?: { x: number; y: number };
    position?: {offsetLeft: number, offsetTop: number};
};