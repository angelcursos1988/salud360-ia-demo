export const generatePatientReport = async (patient, messages) => {
  try {
    // Importación dinámica para compatibilidad con Vercel
    const html2pdf = (await import('html2pdf.js')).default;

    const element = document.createElement('div');
    element.style.padding = '40px';
    element.style.fontFamily = 'Arial, sans-serif';

    element.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #16a085; padding-bottom: 20px; margin-bottom: 30px;">
        <div>
          <h1 style="color: #16a085; margin: 0;">Informe Clínico Salud360</h1>
          <p style="margin: 5px 0; color: #666;">ID Seguimiento: ${patient.id.slice(0, 8)}</p>
        </div>
        <img src="/logo.jpg" style="width: 70px; height: 70px; object-fit: contain; border-radius: 5px;" />
      </div>

      <div style="margin-bottom: 30px; background: #f8f9fa; padding: 15px; border-radius: 8px;">
        <p style="margin: 5px 0;"><strong>Paciente:</strong> ${patient.name}</p>
        <p style="margin: 5px 0;"><strong>Fecha de Emisión:</strong> ${new Date().toLocaleDateString()}</p>
      </div>

      <h2 style="font-size: 18px; color: #2c3e50; border-bottom: 1px solid #eee; padding-bottom: 10px;">Resumen de Conversación con IA</h2>
      <div style="margin-top: 15px;">
        ${messages.map(m => `
          <div style="margin-bottom: 15px; padding: 12px; background: white; border-left: 4px solid ${m.role === 'user' ? '#2980b9' : '#27ae60'}; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <strong style="color: ${m.role === 'user' ? '#2980b9' : '#27ae60'}; font-size: 12px; text-transform: uppercase;">
              ${m.role === 'user' ? 'Paciente' : 'Asistente Médico IA'}
            </strong>
            <p style="margin: 8px 0 0 0; color: #333; line-height: 1.4;">${m.content || m.message || ''}</p>
          </div>
        `).join('')}
      </div>

      <footer style="margin-top: 50px; font-size: 10px; color: #95a5a6; text-align: center; border-top: 1px solid #eee; padding-top: 20px;">
        Este es un documento informativo generado por la plataforma Salud360. 
        Debe ser validado por un profesional colegiado.
      </footer>
    `;

    const opt = {
      margin: 0.5,
      filename: `Informe_Salud360_${patient.name.replace(/\s+/g, '_')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true,
        logging: false 
      },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    await html2pdf().set(opt).from(element).save();

  } catch (error) {
    console.error("Error al generar PDF:", error);
    alert("No se pudo generar el PDF. Verifica que logo.jpg esté en la carpeta public.");
  }
};