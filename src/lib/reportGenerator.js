export const generatePatientReport = async (patient, messages) => {
  try {
    const html2pdf = (await import('html2pdf.js')).default;
    const element = document.createElement('div');
    
    // TRUCO: Ruta absoluta para que Vercel cargue el logo en el PDF
    const logoUrl = window.location.origin + '/logo.jpg';

    element.innerHTML = `
      <div style="padding: 40px; font-family: Arial, sans-serif; color: #333;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #16a085; padding-bottom: 20px; margin-bottom: 30px;">
          <div>
            <h1 style="color: #16a085; margin: 0; font-size: 24px;">INFORME CLÍNICO DE SEGUIMIENTO</h1>
            <p style="margin: 5px 0; color: #666;">Plataforma de Asistencia Salud360 IA</p>
          </div>
          <img src="${logoUrl}" style="width: 80px; height: 80px; object-fit: contain;" />
        </div>

        <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin-bottom: 30px;">
          <p style="margin: 5px 0;"><strong>Paciente:</strong> ${patient.name}</p>
          <p style="margin: 5px 0;"><strong>ID Sistema:</strong> ${patient.id}</p>
          <p style="margin: 5px 0;"><strong>Fecha del Informe:</strong> ${new Date().toLocaleDateString()}</p>
        </div>

        <h2 style="font-size: 18px; border-bottom: 1px solid #eee; padding-bottom: 10px;">Resumen de Interacción con IA</h2>
        <div style="margin-top: 20px;">
          ${messages.map(m => `
            <div style="margin-bottom: 15px; padding: 10px; border-left: 4px solid ${m.role === 'user' ? '#3498db' : '#27ae60'}">
              <p style="font-size: 10px; font-weight: bold; margin: 0; text-transform: uppercase; color: #888;">
                ${m.role === 'user' ? 'Paciente' : 'Asistente Médico'}
              </p>
              <p style="margin: 5px 0; font-size: 13px;">${m.content || m.message}</p>
            </div>
          `).join('')}
        </div>

        <div style="margin-top: 50px; text-align: center; border-top: 1px solid #eee; padding-top: 20px;">
          <p style="font-size: 10px; color: #999;">
            Este documento es una transcripción de la sesión de asistencia virtual. 
            No sustituye una receta médica formal.
          </p>
        </div>
      </div>
    `;

    const opt = {
      margin: 0,
      filename: `Informe_Salud360_${patient.name}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true, 
        letterRendering: true 
      },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    await html2pdf().set(opt).from(element).save();

  } catch (err) {
    console.error("Error generando PDF:", err);
    alert("Error al procesar el logo o el contenido del PDF.");
  }
};