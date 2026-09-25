import PasswordGenerator from "../components/PasswordGenerator";
import "./Generator.css";

function Generator() {
	return (
		<div className="generator-container">
			<h1>Generator</h1>
			<p className="generator-intro">
				Passwords are generated on this device with the browser's
				cryptographic random number generator and are never sent anywhere.
			</p>
			<div className="generator-card">
				<PasswordGenerator />
			</div>
		</div>
	);
}

export default Generator;
