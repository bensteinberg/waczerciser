window.onload = () => {
	const letters = document.querySelectorAll('.wave-text span');
	let currentIndex = 0;
	
	function animate() {
		letters.forEach((letter, index) => {
			const offset = (index - currentIndex) * 0.3;
			const y = Math.sin(offset) * 20;
			letter.style.transform = `translateY(${y}px)`;
		});
		
		currentIndex += 0.15;
		requestAnimationFrame(animate);
	}
	
	animate();
};
