interface DeleteAccountProps {
	onBack: () => void;
}

function DeleteAccount({ onBack }: DeleteAccountProps) {
	return (
		<div>
			<button type="button" onClick={onBack}>
				Back
			</button>
		</div>
	);
}

export default DeleteAccount;
