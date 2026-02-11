import html2pdf from 'html2pdf.js';

export const generatePatientReport = (patient, messages) => {
  const element = document.createElement('div');
  element.innerHTML = `
    <div style="padding: 40px; font-family: sans-serif; color: #333;">
      <h1 style="color: #16a085;">Resumen Clínico Salud360</h1>
      <hr />
      <p><strong>Paciente:</strong> ${patient.name}</p>
      <p><strong>ID:</strong> ${patient.id}</p>
      <p><strong>Fecha del Informe:</strong> ${new Date().toLocaleDateString()}</p>
      
      <h2 style="margin-top: 30px; color: #2c3e50;">Historial de Conversación con IA</h2>
      <div style="background: #f9f9f9; padding: 20px; border-radius: 10px;">
        ${messages.map(m => `
          <p style="margin-bottom: 15px;">
            <strong style="color: ${m.role === 'user' ? '#2980b9' : '#27ae60'}">
              ${m.role === 'user' ? 'Paciente' : 'Asistente IA'}:
            </strong><br />
            ${m.message || m.content}
          </p>
        `).join('')}
      </div>
      
      <footer style="margin-top: 50px; font-size: 12px; color: #999; text-align: center;">
        Este es un pre-informe generado por IA. Debe ser validado por un profesional colegiado.
      </footer>
    </div>
  `;

  const opt = {
    margin: 1,
    filename: `Informe_${patient.name.replace(/\s+/g, '_')}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
  };

  html2pdf().set(opt).from(element).save();
};