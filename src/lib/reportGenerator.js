export const generatePatientReport = async (patient, messages) => {
  console.log("Iniciando generación de PDF para:", patient.name);

  try {
    // 1. Carga dinámica de la librería
    const html2pdf = (await import('html2pdf.js')).default;
    console.log("Librería html2pdf cargada correctamente");

    // 2. Crear el contenedor del informe
    const element = document.createElement('div');
    element.style.padding = '40px';
    element.style.fontFamily = 'Arial, sans-serif';
    
    // 3. Construir el contenido
    const htmlContent = `
      <div style="color: #2c3e50;">
        <h1 style="color: #16a085; border-bottom: 2px solid #16a085; padding-bottom: 10px;">
          Informe Clínico Salud360
        </h1>
        <p><strong>Paciente:</strong> ${patient.name}</p>
        <p><strong>Fecha:</strong> ${new Date().toLocaleDateString()}</p>
        <p><strong>ID Seguimiento:</strong> ${patient.id.slice(0, 8)}</p>
        
        <h2 style="margin-top: 30px; font-size: 18px;">Resumen de Interacción con IA</h2>
        <div style="background: #f4f7f6; padding: 20px; border-radius: 8px;">
          ${messages && messages.length > 0 
            ? messages.map(m => `
                <div style="margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 5px;">
                  <strong style="color: ${m.role === 'user' ? '#2980b9' : '#27ae60'}">
                    ${m.role === 'user' ? 'Paciente' : 'Asistente IA'}:
                  </strong>
                  <p style="margin: 5px 0;">${m.message || m.content || ''}</p>
                </div>
              `).join('')
            : '<p>No hay mensajes registrados en esta sesión.</p>'
          }
        </div>
        
        <div style="margin-top: 40px; font-size: 10px; color: #95a5a6; text-align: center;">
          Informe generado automáticamente por el sistema Salud360 IA. 
          Requiere validación médica profesional.
        </div>
      </div>
    `;
    
    element.innerHTML = htmlContent;

    // 4. Configuración y Guardado
    const opt = {
      margin: 0.5,
      filename: `Informe_${patient.name.replace(/\s+/g, '_')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    console.log("Lanzando descarga de archivo...");
    await html2pdf().set(opt).from(element).save();
    console.log("¡Descarga completada!");

  } catch (error) {
    console.error("ERROR CRÍTICO GENERANDO PDF:", error);
    alert("Error técnico al generar el PDF. Revisa la consola (F12).");
  }
};