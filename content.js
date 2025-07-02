// document.querySelectorAll('input[type="file"]').forEach((input, index) => {
//   console.log(`FormEase detected a file input! (${index + 1})`);
// });



document.querySelectorAll('input[type="file"]').forEach((input, index) => {
  // Create Edit button
  const editButton = document.createElement('button');
  editButton.textContent = 'Edit';
  editButton.className = 'formease-edit-btn';

  // Position the button right after the input
  const rect = input.getBoundingClientRect();
  editButton.style.position = 'absolute';
  editButton.style.top = `${rect.top + window.scrollY}px`;
  editButton.style.left = `${rect.right + 10 + window.scrollX}px`;

  // Append the button to the body
  document.body.appendChild(editButton);

  // On click, simulate opening the toolbox
  editButton.addEventListener('click', () => {
    console.log('Toolbox opening...');
  });
});

