import React, { Dispatch, ReactNode, useCallback, useEffect, useState } from "react";
import DraggableEventReceiver from "./DraggableEventReceiver";
import DraggableElementPosition from "./DraggableElementPosition";
import DraggableEvent from "./DraggableEvent";
import DraggableEventNames from "./DraggableEventNames";
import useChatContextStore from "../../hooks/useChatContextStore";
import { ILiveChatWidgetContext } from "../../contexts/common/ILiveChatWidgetContext";
import { ILiveChatWidgetAction } from "../../contexts/common/ILiveChatWidgetAction";
import { ConversationState } from "../../contexts/common/ConversationState";
import { isNullOrUndefined } from "../../common/utils";

interface DraggableChatWidgetProps {
    disable?: boolean;
    channel?: string;
    elementId: string;
    children: ReactNode;
}

const DraggableChatWidget = (props: DraggableChatWidgetProps) => {
    const [state, dispatch]: [ILiveChatWidgetContext, Dispatch<ILiveChatWidgetAction>] = useChatContextStore();
    const [initialPosition, setInitialPosition] = useState({offsetLeft: 0, offsetTop: 0});
    const [cachedPosition, setCachedPosition] = useState<undefined|DraggableElementPosition>(undefined);
    const [position, setPosition] = useState({offsetLeft: 0, offsetTop: 0});
    const [delta, setDelta] = useState({left: 0, top: 0});

    const repositionElement = (draggableElement: HTMLElement, offsetLeft: number, offsetTop: number) => {
        draggableElement.style.left = `${offsetLeft}px`;
        draggableElement.style.top = `${offsetTop}px`;
    };

    const calculateOffsetsWithinViewport = useCallback((id: string, offset, delta) => {
        const draggableElement: HTMLElement | null = document.getElementById(id);
        const positionRelativeToViewport = (draggableElement as HTMLElement).getBoundingClientRect();

        let offsetLeft = offset.offsetLeft;
        let offsetTop = offset.offsetTop;

        // Widget size larger than viewport would not have any restriction
        if (positionRelativeToViewport.width > window.innerWidth) {
            return;
        }

        if (positionRelativeToViewport.height > window.innerHeight) {
            return;
        }

        // Ensures widget is within viewport
        if (positionRelativeToViewport.x < 0) {
            offsetLeft = 0 - delta.left;
        }

        if (positionRelativeToViewport.y < 0) {
            offsetTop = 0 - delta.top;
        }

        if (positionRelativeToViewport.x + positionRelativeToViewport.width > window.innerWidth) {
            offsetLeft = window.innerWidth - positionRelativeToViewport.width - delta.left;
        }

        if (positionRelativeToViewport.y + positionRelativeToViewport.height > window.innerHeight) {
            offsetTop = window.innerHeight - positionRelativeToViewport.height - delta.top;
        }

        repositionElement(draggableElement as HTMLElement, offsetLeft, offsetTop);
        setPosition({offsetLeft, offsetTop});
    }, []);

    const resetPosition = useCallback((targetPosition: DraggableElementPosition) => {
        calculateOffsetsWithinViewport(props.elementId, targetPosition, delta); // Ensure viewport restriction
    }, [delta]);

    useEffect(() => {
        if (props.disable !== false) {
            return;
        }

        const cacheInitialPosition = () => {
            const draggableElement: HTMLElement | null = document.getElementById(props.elementId);
            const offsetLeft = (draggableElement as HTMLElement).offsetLeft as number;
            const offsetTop = (draggableElement as HTMLElement).offsetTop as number;
            setInitialPosition({offsetLeft, offsetTop});
        };

        const calculateOffsets = () => {
            const draggableElement: HTMLElement | null = document.getElementById(props.elementId);
            const offsetLeft = (draggableElement as HTMLElement).offsetLeft as number;
            const offsetTop = (draggableElement as HTMLElement).offsetTop as number;

            // Calculates the delta between the position of the widget and the position of the widget relative to the viewport which will be used for repositioning
            const positionRelativeToViewport = (draggableElement as HTMLElement).getBoundingClientRect();
            const left = positionRelativeToViewport.left - offsetLeft;
            const top = positionRelativeToViewport.top - offsetTop;
            setDelta({left, top});

            calculateOffsetsWithinViewport(props.elementId, {offsetLeft, offsetTop}, {left, top});
        };

        calculateOffsets();
        cacheInitialPosition();

        window.addEventListener("resize", calculateOffsets);

        return () => {
            window.removeEventListener("resize", calculateOffsets);
        };
    }, [props.disable]);

    useEffect(() => {
        if (props.disable !== false) {
            return;
        }

        if (state.appStates.conversationState == ConversationState.Closed) {
            resetPosition(initialPosition);
        } else if (state.appStates.isMinimized) {
            const draggableElement: HTMLElement | null = document.getElementById(props.elementId);
            const offsetLeft = (draggableElement as HTMLElement).offsetLeft as number;
            const offsetTop = (draggableElement as HTMLElement).offsetTop as number;

            if (!cachedPosition) {
                setCachedPosition({offsetLeft, offsetTop});
            }

            resetPosition(initialPosition);
        } else if (!isNullOrUndefined(state.appStates.isMinimized) && !state.appStates.isMinimized) {
            if (cachedPosition) {
                resetPosition(cachedPosition as DraggableElementPosition);
                setCachedPosition(undefined);
            }
        }
    }, [props.disable, state.appStates.isMinimized, state.appStates.conversationState, initialPosition, cachedPosition]);

    const onEvent = useCallback((event: DraggableEvent) => {
        if (event.eventName === DraggableEventNames.Dragging) {
            if (event.offset) {
                const offsetLeft = position.offsetLeft + event.offset.x;
                const offsetTop = position.offsetTop + event.offset.y;

                // Update position via DOM manipulation to prevent <Stack/> continuously rendering on style change causing high CPU spike
                const draggableElement: HTMLElement | null = document.getElementById(props.elementId);
                repositionElement(draggableElement as HTMLElement, offsetLeft, offsetTop);

                setPosition({offsetLeft, offsetTop});
                calculateOffsetsWithinViewport(props.elementId, {offsetLeft, offsetTop}, delta);
            }
        }
    }, [position, delta]);

    if (props.disable) {
        return (
            <>
                {props.children}
            </>
        );
    }

    return (
        <>
            <DraggableEventReceiver channel={props.channel?? "lcw"} onEvent={onEvent}>
                {props.children}
            </DraggableEventReceiver>
        </>
    );
};

export default DraggableChatWidget;