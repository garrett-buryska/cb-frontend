// src/pages/Board.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown'; 
import remarkGfm from 'remark-gfm';
import Navbar from '../components/Navbar';
import { apiClient } from '../api/client';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

export default function Board() {
    const { boardId } = useParams();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [isMounted, setIsMounted] = useState(false); // React 18 Strict Mode fix

    // --- Core State ---
    const [board, setBoard] = useState(null);
    const [columns, setColumns] = useState([]);
    const [cards, setCards] = useState([]);

    // --- UI State ---
    const [editingColumnId, setEditingColumnId] = useState(null);
    const [addingCardToColumn, setAddingCardToColumn] = useState(null);
    const [newCardTitle, setNewCardTitle] = useState('');

    // --- Modal State ---
    const [activeCard, setActiveCard] = useState(null);
    const [isEditingBody, setIsEditingBody] = useState(false);
    const [editedBody, setEditedBody] = useState('');
    const [editedCardTitle, setEditedCardTitle] = useState('');

    // --- INITIAL LOAD ---
    useEffect(() => {
        setIsMounted(true);
        const fetchBoardData = async () => {
            setIsLoading(true);
            try {
                const response = await apiClient(`/boards/${boardId}`, 'GET');
                const boardData = response.board || response;

                setBoard({ id: boardData.id, title: boardData.title });

                const loadedColumns = [];
                const loadedCards = [];

                if (boardData.columns && Array.isArray(boardData.columns)) {
                    boardData.columns.forEach(col => {
                        if (col.id) {
                            loadedColumns.push({
                                id: col.id,
                                title: col.title,
                                position: col.position
                            });

                            if (col.cards && Array.isArray(col.cards)) {
                                col.cards.forEach(card => {
                                    if (card.id) {
                                        loadedCards.push({
                                            id: card.id,
                                            title: card.title,
                                            body: card.body,
                                            position: card.position,
                                            columnId: col.id 
                                        });
                                    }
                                });
                            }
                        }
                    });
                }

                setColumns(loadedColumns);
                setCards(loadedCards);
                setIsLoading(false);

            } catch (err) {
                console.error("Failed to load board:", err);
                setIsLoading(false);
            }
        };

        fetchBoardData();
    }, [boardId]);

    // --- UTILS: POSITIONS ---
    const getNextPosition = (items) => {
        if (items.length === 0) return 65536;
        const maxPos = Math.max(...items.map(i => i.position));
        return maxPos + 65536;
    };

    // --- COLUMN CRUD ---
    const handleAddColumn = async () => {
        const title = prompt("Enter new column name:");
        if (!title) return;

        const newPos = getNextPosition(columns);
        const response = await apiClient(`/boards/${boardId}/columns`, 'POST', { body: { title, position: newPos } });

        const newCol = {
            id: response.column.id,
            title: response.column.title,
            position: response.column.position
        };

        setColumns([...columns, newCol]);
    };

    const handleUpdateColumnTitle = async (colId, newTitle) => {
        setEditingColumnId(null);
        if (!newTitle.trim()) return;

        await apiClient(`/boards/${boardId}/columns/${colId}`, 'PUT', { body: { title: newTitle } });
        setColumns(columns.map(c => c.id === colId ? { ...c, title: newTitle } : c));
    };

    const handleDeleteColumn = async (colId) => {
        if (!window.confirm("Delete this entire column and all its cards?")) return;

        await apiClient(`/boards/${boardId}/columns/${colId}`, 'DELETE');
        setColumns(columns.filter(c => c.id !== colId));
        setCards(cards.filter(c => c.columnId !== colId));
    };

    // --- CARD CRUD ---
    const handleAddCard = async (e, columnId) => {
        e.preventDefault();
        if (!newCardTitle.trim()) {
            setAddingCardToColumn(null);
            return;
        }

        const colCards = cards.filter(c => c.columnId === columnId);
        const newPos = getNextPosition(colCards);

        const response = await apiClient(`/columns/${columnId}/cards`, 'POST', { body: { columnId, title: newCardTitle, position: newPos } });

        const newCard = {
            id: response.card.id,
            columnId: columnId,
            title: response.card.title,
            position: response.card.position,
            body: '',
        };

        setCards([...cards, newCard]);
        setNewCardTitle('');
        setAddingCardToColumn(null);
    };

    const handleDeleteCard = async () => {
        if (!window.confirm("Shred this card?")) return;

        await apiClient(`/columns/${activeCard.columnId}/cards/${activeCard.id}`, 'DELETE');
        setCards(cards.filter(c => c.id !== activeCard.id));
        closeCardModal();
    };

    const handleUpdateCard = async () => {
        await apiClient(`/columns/${activeCard.columnId}/cards/${activeCard.id}`, 'PUT', { body: { title: editedCardTitle, body: editedBody } });

        setCards(cards.map(c => c.id === activeCard.id ? { ...c, title: editedCardTitle, body: editedBody } : c));
        setActiveCard({ ...activeCard, title: editedCardTitle, body: editedBody });
        setIsEditingBody(false);
    };

    // --- MODAL HELPERS ---
    const openCardModal = (card) => {
        setActiveCard(card);
        setEditedCardTitle(card.title);
        setEditedBody(card.body || '');
        setIsEditingBody(false);
    };

    const closeCardModal = () => {
        setActiveCard(null);
    };

    // --- RENDER HELPERS ---
    const sortedColumns = [...columns].sort((a, b) => a.position - b.position);
    const getSortedCards = (colId) => [...cards].filter(c => c.columnId === colId).sort((a, b) => a.position - b.position);

    const onDragEnd = async (result) => {
        const { destination, source, draggableId, type } = result;

        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        if (type === 'column') {
            // Strip the "col-" prefix to get the real DB ID
            const draggingId = parseInt(draggableId.replace('col-', ''));
            
            const newOrderedCols = [...sortedColumns];
            const [removed] = newOrderedCols.splice(source.index, 1);
            newOrderedCols.splice(destination.index, 0, removed);

            const prev = newOrderedCols[destination.index - 1];
            const next = newOrderedCols[destination.index + 1];

            let newPos;
            if (!prev && !next) newPos = 65536;
            else if (!prev) newPos = next.position / 2;
            else if (!next) newPos = prev.position + 65536;
            else newPos = (prev.position + next.position) / 2;

            if (newPos <= 0) newPos = 1;

            setColumns(prevCols => prevCols.map(c =>
                c.id === draggingId ? { ...c, position: newPos } : c
            ));

            await apiClient(`/boards/${boardId}/columns/${draggingId}`, 'PUT', {
                body: { position: newPos, title: removed.title }
            });

        } else {
            // Strip the "card-" and "col-" prefixes to get real DB IDs
            const draggingId = parseInt(draggableId.replace('card-', ''));
            const destColId = parseInt(destination.droppableId.replace('col-', ''));
            const sourceColId = parseInt(source.droppableId.replace('col-', ''));

            const sourceCards = getSortedCards(sourceColId);
            const movingCard = cards.find(c => c.id === draggingId);

            let newCardsInDest = getSortedCards(destColId);
            if (sourceColId === destColId) {
                newCardsInDest.splice(source.index, 1);
            }
            newCardsInDest.splice(destination.index, 0, movingCard);

            const prev = newCardsInDest[destination.index - 1];
            const next = newCardsInDest[destination.index + 1];

            let newPos;
            if (!prev && !next) newPos = 65536;
            else if (!prev) newPos = next.position / 2;
            else if (!next) newPos = prev.position + 65536;
            else newPos = (prev.position + next.position) / 2;

            if (newPos <= 0) newPos = 1;

            setCards(prevCards => prevCards.map(c =>
                c.id === draggingId
                    ? { ...c, position: newPos, columnId: destColId }
                    : c
            ));

            await apiClient(`/columns/${destColId}/cards/${draggingId}`, 'PUT', {
                body: {
                    position: newPos,
                    columnId: destColId,
                    title: movingCard.title
                }
            });
        }
    };

    if (isLoading || !isMounted) return <div className="min-h-screen bg-board flex items-center justify-center font-bold text-ink-muted">Unpacking board...</div>;

    return (
        <div className="h-screen flex flex-col font-sans overflow-hidden">
            <Navbar />

            {/* Board Header */}
            <header className="px-6 py-4 flex items-center gap-4 bg-list/40 border-b border-ink/5 shrink-0">
                <button
                    onClick={() => navigate('/list')}
                    className="p-1.5 text-ink hover:bg-ink/10 rounded transition-colors"
                    title="Back to Workspaces"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <h2 className="text-2xl font-extrabold text-ink tracking-tight">{board?.title}</h2>
            </header>

            {/* Kanban Canvas */}
            <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="board" type="column" direction="horizontal">
                    {(provided) => (
                        <main 
                            {...provided.droppableProps} 
                            ref={provided.innerRef}
                            className="flex-1 overflow-x-auto overflow-y-hidden p-6 flex items-start gap-6" 
                        >
                            {sortedColumns.map((column, index) => (
                                <Draggable key={`col-${column.id}`} draggableId={`col-${column.id}`} index={index}>
                                    {(provided) => (
                                        <div 
                                            ref={provided.innerRef} 
                                            {...provided.draggableProps}
                                            className="w-72 shrink-0 bg-list/90 backdrop-blur-sm rounded-xl max-h-full flex flex-col shadow-sm border border-ink/10" 
                                        >
                                            {/* Column Header */}
                                            <div {...provided.dragHandleProps} className="p-3 flex justify-between items-center group cursor-pointer">
                                                {editingColumnId === column.id ? (
                                                    <input
                                                        type="text"
                                                        autoFocus
                                                        defaultValue={column.title}
                                                        onBlur={(e) => handleUpdateColumnTitle(column.id, e.target.value)}
                                                        onKeyDown={(e) => e.key === 'Enter' && handleUpdateColumnTitle(column.id, e.target.value)}
                                                        className="font-bold text-ink bg-paper px-2 py-1 rounded outline-none border border-tape ring-2 ring-tape/20 w-full"
                                                    />
                                                ) : (
                                                    <h3
                                                        onClick={() => setEditingColumnId(column.id)}
                                                        className="font-bold text-ink px-2 py-1 rounded hover:bg-ink/5 w-full transition-colors"
                                                    >
                                                        {column.title}
                                                    </h3>
                                                )}

                                                <button
                                                    onClick={() => handleDeleteColumn(column.id)}
                                                    className="opacity-0 group-hover:opacity-100 p-1.5 text-ink-muted hover:text-tag-red hover:bg-tag-red/10 rounded transition-all"
                                                    title="Delete Column"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                </button>
                                            </div>

                                            {/* Cards Container */}
                                            <Droppable droppableId={`col-${column.id}`} type="card">
                                                {(provided) => (
                                                    <div 
                                                        ref={provided.innerRef} 
                                                        {...provided.droppableProps} 
                                                        className="flex-1 overflow-y-auto p-2 space-y-3 custom-scrollbar min-h-[10px]"
                                                    >
                                                        {getSortedCards(column.id).map((card, cardIndex) => (
                                                            <Draggable key={`card-${card.id}`} draggableId={`card-${card.id}`} index={cardIndex}>
                                                                {(provided) => (
                                                                    <div
                                                                        ref={provided.innerRef}
                                                                        {...provided.draggableProps}
                                                                        {...provided.dragHandleProps}
                                                                        onClick={() => openCardModal(card)}
                                                                        className="bg-paper p-3.5 rounded-lg shadow-[0_2px_4px_rgb(52,42,33,0.06)] border border-ink/5 cursor-pointer hover:shadow-[0_4px_8px_rgb(52,42,33,0.12)] hover:-translate-y-0.5 hover:border-tape/30 transition-all group"
                                                                    >
                                                                        <h4 className="text-sm font-semibold text-ink leading-snug">{card.title}</h4>
                                                                        {card.body && (
                                                                            <div className="mt-2 text-ink-muted">
                                                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" /></svg>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </Draggable>
                                                        ))}
                                                        {provided.placeholder}

                                                        {/* Add Card Form */}
                                                        {addingCardToColumn === column.id ? (
                                                            <form onSubmit={(e) => handleAddCard(e, column.id)} className="p-1">
                                                                <textarea
                                                                    autoFocus
                                                                    value={newCardTitle}
                                                                    onChange={(e) => setNewCardTitle(e.target.value)}
                                                                    placeholder="Enter a title for this card..."
                                                                    className="w-full p-2.5 bg-paper rounded-lg border border-tape ring-2 ring-tape/20 outline-none text-sm resize-none"
                                                                    rows="3"
                                                                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddCard(e, column.id); } }}
                                                                />
                                                                <div className="flex items-center gap-2 mt-2">
                                                                    <button type="submit" className="px-3 py-1.5 bg-stamp hover:bg-stamp-hover text-white text-sm font-bold rounded shadow-sm">Add Card</button>
                                                                    <button type="button" onClick={() => setAddingCardToColumn(null)} className="p-1.5 text-ink-muted hover:text-ink hover:bg-ink/10 rounded">
                                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                                    </button>
                                                                </div>
                                                            </form>
                                                        ) : (
                                                            <button
                                                                onClick={() => setAddingCardToColumn(column.id)}
                                                                className="w-full py-2 px-3 flex items-center gap-2 text-sm font-bold text-ink-muted hover:text-ink hover:bg-ink/5 rounded-lg transition-colors"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                                                Add a card
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </Droppable>
                                        </div>
                                    )}
                                </Draggable>
                            ))}
                            {provided.placeholder}

                            {/* Add Column Button */}
                            <button
                                onClick={handleAddColumn}
                                className="w-72 shrink-0 bg-list/40 hover:bg-list/70 border-2 border-dashed border-ink/20 hover:border-tape py-3 px-4 rounded-xl flex items-center gap-2 text-ink-muted font-bold transition-all focus:outline-none focus:ring-4 focus:ring-tape/20"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                Add another column
                            </button>
                        </main>
                    )}
                </Droppable>
            </DragDropContext>

            {/* --- CARD MODAL --- */}
            {activeCard && (
                <div className="fixed inset-0 bg-ink/30 backdrop-blur-sm flex items-start justify-center z-50 p-4 sm:p-12 overflow-y-auto animate-[fadeIn_0.2s_ease-out]">
                    <div className="bg-paper w-full max-w-3xl rounded-xl shadow-[0_20px_60px_rgb(52,42,33,0.3)] border border-ink/10 relative my-auto">
                        <button onClick={closeCardModal} className="absolute top-4 right-4 p-2 text-ink-muted hover:bg-ink/5 hover:text-ink rounded-full transition-colors">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <div className="p-8 sm:p-10">
                            <div className="flex items-start gap-3 mb-8">
                                <svg className="w-6 h-6 text-ink/40 mt-1 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                                <div className="w-full pr-8">
                                    <input
                                        type="text"
                                        value={editedCardTitle}
                                        onChange={(e) => setEditedCardTitle(e.target.value)}
                                        onBlur={handleUpdateCard}
                                        className="text-2xl font-extrabold text-ink bg-transparent outline-none w-full border-2 border-transparent hover:border-ink/10 focus:border-tape focus:bg-paper px-2 py-1 -ml-2 rounded transition-all"
                                    />
                                    <p className="text-sm text-ink-muted font-medium mt-1">
                                        in list <span className="underline decoration-ink/20">{columns.find(c => c.id === activeCard.columnId)?.title}</span>
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <svg className="w-6 h-6 text-ink/40 mt-1 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" /></svg>
                                <div className="w-full">
                                    <div className="flex justify-between items-center mb-3">
                                        <h3 className="text-lg font-bold text-ink">Description</h3>
                                        <button
                                            onClick={() => isEditingBody ? handleUpdateCard() : setIsEditingBody(true)}
                                            className="px-3 py-1.5 bg-list hover:bg-ink/10 text-ink text-sm font-bold rounded transition-colors"
                                        >
                                            {isEditingBody ? 'Save Description' : 'Edit Description'}
                                        </button>
                                    </div>
                                    {isEditingBody ? (
                                        <textarea
                                            autoFocus
                                            value={editedBody}
                                            onChange={(e) => setEditedBody(e.target.value)}
                                            placeholder="Add a more detailed description..."
                                            className="w-full min-h-[200px] p-4 bg-paper border-2 border-tape ring-2 ring-tape/15 rounded-lg text-ink font-mono text-sm resize-y outline-none shadow-inner"
                                        />
                                    ) : (
                                        <div
                                            onClick={() => setIsEditingBody(true)}
                                            className={`prose prose-stone prose-sm max-w-none bg-list/30 hover:bg-list/60 p-4 rounded-lg cursor-pointer min-h-[100px] transition-colors border border-transparent hover:border-ink/10 ${!editedBody && 'text-ink-muted italic'}`}
                                        >
                                            {editedBody ? (
                                                <div className="prose max-w-none">
                                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{editedBody}</ReactMarkdown>
                                                </div>
                                            ) : (
                                                "Click here to add a more detailed description using Markdown..."
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="mt-12 pt-6 border-t border-ink/10 flex justify-end">
                                <button
                                    onClick={() => handleDeleteCard()}
                                    className="flex items-center gap-2 px-4 py-2 text-tag-red font-bold hover:bg-tag-red/10 rounded-lg transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    Delete Card
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}