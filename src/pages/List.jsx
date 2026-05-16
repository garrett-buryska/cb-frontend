// src/pages/List.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // <-- Add this import
import Navbar from '../components/Navbar';
import { apiClient } from '../api/client';

export default function Boards() {
	const navigate = useNavigate();
	const [boards, setBoards] = useState([]);
	const [searchQuery, setSearchQuery] = useState('');
	const [isLoading, setIsLoading] = useState(true);

	// Modal State
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingBoard, setEditingBoard] = useState(null);
	const [boardTitle, setBoardTitle] = useState('');

	const fetchBoards = async () => {
		setIsLoading(true);
		try {
			const data = await apiClient('/boards', 'GET');
			setBoards(data);
			setIsLoading(false);
		} catch (err) {
			console.error("Failed to fetch boards:", err);
			setIsLoading(false);
		}
	};

	useEffect(() => {
		fetchBoards();
	}, []);

	const handleSaveBoard = async (e) => {
		e.preventDefault();
		try {
			if (editingBoard) {
				await apiClient(`/boards/${editingBoard.id}`, 'PUT', { body: { title: boardTitle } });
				setBoards(boards.map(b => b.id === editingBoard.id ? { ...b, title: boardTitle } : b));
			} else {
				const response = await apiClient('/boards', 'POST', { body: { title: boardTitle } });

				const newBoard = {
					id: response.board.id,
					title: response.board.title,
				};

				setBoards([...boards, newBoard]);
			}
			closeModal();
		} catch (err) {
			console.error("Failed to save board:", err);
			// TODO: Handle error state (show toast/message)
		}
	};

	const handleDelete = async (id) => {
		// TODO: Consider replacing this with a custom styled confirm modal
		if (!window.confirm('Are you sure you want to toss this board in the recycling?')) return;

		try {
			await apiClient(`/boards/${id}`, 'DELETE');
			setBoards(boards.filter(b => b.id !== id));
		} catch (err) {
			console.error("Failed to delete board:", err);
		}
	};

	// --- UI HELPERS ---

	const openModal = (board = null) => {
		setEditingBoard(board);
		setBoardTitle(board ? board.title : '');
		setIsModalOpen(true);
	};

	const closeModal = () => {
		setIsModalOpen(false);
		setEditingBoard(null);
		setBoardTitle('');
	};

	const filteredBoards = boards.filter(board => {
		// 1. Safely grab the title, falling back to an empty string if it's missing
		const safeTitle = board?.title || '';

		// 2. Safely grab the search query
		const safeSearch = searchQuery || '';

		// 3. Now it is mathematically impossible to call .toLowerCase() on undefined
		return safeTitle.toLowerCase().includes(safeSearch.toLowerCase());
	});

	return (
		<div className="min-h-screen font-sans flex flex-col">
			<Navbar />

			<main className="flex-1 p-6 sm:p-10 max-w-7xl mx-auto w-full">

				{/* Page Header & Search */}
				<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
					<div>
						<h2 className="text-3xl font-extrabold text-ink tracking-tight">Your Workspaces</h2>
						<p className="text-ink-muted text-sm mt-1">Select a board to start organizing.</p>
					</div>

					<div className="w-full sm:w-72 relative">
						{/* Search Icon */}
						<svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
						</svg>
						<input
							type="text"
							placeholder="Search boards..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="w-full pl-9 pr-4 py-2.5 bg-list/50 border-2 border-transparent rounded-lg text-ink placeholder-ink/40 transition-all focus:bg-paper focus:border-tape focus:outline-none focus:ring-4 focus:ring-tape/15"
						/>
					</div>
				</div>

				{/* Board Grid */}
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">

					{/* Create New Board Card */}
					<button
						onClick={() => openModal()}
						className="group flex flex-col items-center justify-center h-40 bg-list/30 border-2 border-dashed border-ink/20 rounded-xl hover:bg-list/60 hover:border-tape transition-all focus:outline-none focus:ring-4 focus:ring-tape/20"
					>
						<div className="w-10 h-10 rounded-full bg-ink/5 flex items-center justify-center mb-2 group-hover:bg-tape/10 group-hover:text-tape text-ink/40 transition-colors">
							<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
							</svg>
						</div>
						<span className="font-bold text-ink/60 group-hover:text-ink">Create New Board</span>
					</button>

					{/* Render Filtered Boards */}
					{isLoading ? (
						<div className="h-40 flex items-center justify-center text-ink-muted font-bold animate-pulse">Unpacking boxes...</div>
					) : filteredBoards.map(board => (
						<div
							key={board.id}
							onClick={() => navigate(`/boards/${board.id}`)}
							className="group relative h-40 p-5 bg-paper rounded-xl shadow-[0_4px_12px_rgb(52,42,33,0.06)] border border-ink/5 flex flex-col justify-between hover:shadow-[0_12px_24px_rgb(52,42,33,0.12)] hover:-translate-y-1 transition-all cursor-pointer animate-[slideUp_0.3s_ease-out]"
						>
							<div>
								<h3 className="font-extrabold text-lg text-ink leading-tight pr-12">{board.title}</h3>
								<p className="text-xs text-ink-muted mt-1 font-medium">Updated: {new Date(board.updated_at).toLocaleString()}</p>
							</div>

							{/* Action Buttons (Visible on hover) */}
							<div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
								{/* Edit Button */}
								<button
									onClick={(e) => { e.stopPropagation(); openModal(board); }}
									className="p-1.5 text-ink-muted hover:text-stamp hover:bg-stamp/10 rounded transition-colors"
									title="Edit Board"
								>
									<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
									</svg>
								</button>
								{/* Delete Button */}
								<button
									onClick={(e) => { e.stopPropagation(); handleDelete(board.id); }}
									className="p-1.5 text-ink-muted hover:text-tag-red hover:bg-tag-red/10 rounded transition-colors"
									title="Delete Board"
								>
									<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
									</svg>
								</button>
							</div>

							{/* Decorative "Tape" or Label indicator at the bottom */}
							<div className="w-8 h-1 bg-tape rounded-full opacity-50"></div>
						</div>
					))}
				</div>

				{!isLoading && filteredBoards.length === 0 && (
					<div className="text-center py-20 text-ink-muted">
						<p className="font-bold">No boards found.</p>
						<p className="text-sm">Try searching for something else, or create a new one.</p>
					</div>
				)}

			</main>

			{/* --- MODAL FOR CREATE / EDIT --- */}
			{isModalOpen && (
				<div className="fixed inset-0 bg-ink/20 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-[fadeIn_0.2s_ease-out]">
					<div className="bg-paper w-full max-w-sm rounded-xl shadow-[0_20px_60px_rgb(52,42,33,0.2)] border border-ink/10 overflow-hidden">

						<div className="p-6">
							<h3 className="text-xl font-extrabold text-ink mb-4">
								{editingBoard ? 'Relabel Box' : 'Pack a New Box'}
							</h3>

							<form onSubmit={handleSaveBoard}>
								<div className="flex flex-col gap-1.5 mb-6">
									<label className="text-[11px] font-bold uppercase tracking-widest text-ink/80">
										Board Name
									</label>
									<input
										type="text"
										value={boardTitle}
										onChange={(e) => setBoardTitle(e.target.value)}
										required
										autoFocus
										placeholder="e.g. Website Launch"
										className="w-full px-4 py-3 bg-list border-2 border-transparent rounded-lg text-ink placeholder-ink/40 transition-all focus:bg-paper focus:border-tape focus:outline-none focus:ring-4 focus:ring-tape/15"
									/>
								</div>

								<div className="flex justify-end gap-3">
									<button
										type="button"
										onClick={closeModal}
										className="px-4 py-2 text-sm font-bold text-ink-muted hover:text-ink hover:bg-ink/5 rounded-lg transition-colors focus:outline-none"
									>
										Cancel
									</button>
									<button
										type="submit"
										className="px-5 py-2 text-sm font-bold bg-stamp hover:bg-stamp-hover text-white rounded-lg shadow-sm transition-all active:translate-y-[1px] focus:outline-none focus:ring-4 focus:ring-stamp/20"
									>
										{editingBoard ? 'Save Changes' : 'Create Board'}
									</button>
								</div>
							</form>
						</div>

					</div>
				</div>
			)}

		</div>
	);
}