import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Info, TriangleAlert } from "lucide-react";
import "./ConfirmDialog.css";

interface ConfirmDialogProps {
	open: boolean;
	title: ReactNode;
	children?: ReactNode;
	tone?: "danger" | "info";
	confirmLabel?: string;
	cancelLabel?: string;
	// Text the user must type exactly before the confirm button enables.
	requireText?: string;
	busy?: boolean;
	onConfirm: () => void;
	onCancel: () => void;
}

// Modal built on the native <dialog>: showModal() provides the backdrop, focus trapping,
// Escape to close and focus restore when it closes.
function ConfirmDialog({
	open,
	title,
	children,
	tone = "danger",
	confirmLabel = "Confirm",
	cancelLabel = "Cancel",
	requireText,
	busy = false,
	onConfirm,
	onCancel,
}: ConfirmDialogProps) {
	const dialogRef = useRef<HTMLDialogElement>(null);
	const [typed, setTyped] = useState("");
	const titleId = useId();
	const bodyId = useId();
	const inputId = useId();

	useEffect(() => {
		const dialog = dialogRef.current;
		if (dialog == null) {
			return;
		}
		if (open && !dialog.open) {
			setTyped("");
			dialog.showModal();
		} else if (!open && dialog.open) {
			dialog.close();
		}
	}, [open]);

	const canConfirm = !busy && (requireText == null || typed === requireText);

	return (
		<dialog
			ref={dialogRef}
			className="confirm-dialog"
			role="alertdialog"
			aria-labelledby={titleId}
			aria-describedby={children ? bodyId : undefined}
			// Escape fires "cancel"; route it through onCancel so the parent state stays in sync.
			onCancel={(e) => {
				e.preventDefault();
				if (!busy) {
					onCancel();
				}
			}}
			// A click on the backdrop lands on the <dialog> element itself.
			onClick={(e) => {
				if (e.target === e.currentTarget && !busy) {
					onCancel();
				}
			}}
		>
			<form
				method="dialog"
				className="confirm-dialog-panel"
				onSubmit={(e) => {
					e.preventDefault();
					if (canConfirm) {
						onConfirm();
					}
				}}
			>
				<div className="confirm-dialog-head">
					<span className={`confirm-dialog-glyph ${tone}`} aria-hidden="true">
						{tone === "danger" ? <TriangleAlert size={18} /> : <Info size={18} />}
					</span>
					<h2 id={titleId}>{title}</h2>
				</div>
				{children && (
					<div id={bodyId} className="confirm-dialog-body">
						{children}
					</div>
				)}
				{requireText != null && (
					<div className="confirm-dialog-field">
						<label htmlFor={inputId}>
							Type <span className="mono">{requireText}</span> to confirm
						</label>
						<input
							id={inputId}
							type="text"
							className="mono"
							value={typed}
							onChange={(e) => setTyped(e.target.value)}
							autoComplete="off"
							spellCheck={false}
							autoFocus
						/>
					</div>
				)}
				<div className="confirm-dialog-actions">
					<button
						type="button"
						className="confirm-dialog-cancel"
						onClick={onCancel}
						disabled={busy}
						autoFocus={requireText == null}
					>
						{cancelLabel}
					</button>
					<button
						type="submit"
						className={tone === "danger" ? "confirm-dialog-danger" : "primary"}
						disabled={!canConfirm}
					>
						{busy ? "Working…" : confirmLabel}
					</button>
				</div>
			</form>
		</dialog>
	);
}

export default ConfirmDialog;
