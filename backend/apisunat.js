// apisunat.js
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

const APISUNAT_BASE_URL = "https://back.apisunat.com";
const APISUNAT_TOKEN = process.env.APISUNAT_TOKEN;
const APISUNAT_PERSONA_ID = process.env.APISUNAT_PERSONA_ID;

const parsearJsonSeguro = async (response) => {
	const text = await response.text();
	if (!text) return {};
	try {
		return JSON.parse(text);
	} catch {
		return { raw: text };
	}
};

const extraerMensajeError = (data) => {
	if (!data) return "Error al emitir comprobante en APISUNAT";
	if (typeof data === "string") return data;
	if (typeof data?.message === "string") return data.message;
	if (typeof data?.error === "string") return data.error;
	if (typeof data?.error?.message === "string") return data.error.message;
	try {
		return JSON.stringify(data);
	} catch {
		return "Error al procesar respuesta de APISUNAT";
	}
};

const enviarDocumento = async ({ endpoint, requestBody }) => {
	const response = await fetch(endpoint, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(requestBody),
	});
	const data = await parsearJsonSeguro(response);
	return { response, data };
};

const textNode = (value, attributes = undefined) => {
	const node = { _text: String(value) };
	if (attributes && Object.keys(attributes).length > 0) {
		node._attributes = attributes;
	}
	return node;
};

const formatearLegenda = (total) => {
	const num = Number(total);
	const partes = String(num.toFixed(2)).split(".");
	const enteros = partes[0] || "0";
	const decimales = partes[1] || "00";

	const numeros = ["", "UNO", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE"];
	const decenas = ["", "", "VEINTE", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
	const centenas = ["", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS", "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"];

	const enterosNum = parseInt(enteros);
	if (enterosNum <= 0) return `CERO CON ${decimales}/100 SOLES`;

	let resultado = "";
	if (enterosNum >= 100) {
		resultado = centenas[Math.floor(enterosNum / 100)];
		const resto = enterosNum % 100;
		if (resto > 0) {
			if (resto < 10) resultado += " " + numeros[resto];
			else if (resto === 20) resultado += " VEINTE";
			else {
				resultado += " " + decenas[Math.floor(resto / 10)];
				if (resto % 10 > 0) resultado += " Y " + numeros[resto % 10];
			}
		}
	} else if (enterosNum >= 20) {
		resultado = decenas[Math.floor(enterosNum / 10)];
		if (enterosNum % 10 > 0) resultado += " Y " + numeros[enterosNum % 10];
	} else {
		resultado = numeros[enterosNum];
	}

	return `${resultado} CON ${decimales}/100 SOLES`;
};

const construirDocumentBody = ({
	tipoDocumento, serie, numero, fecha_de_emision,
	cliente_tipo_de_documento, cliente_numero_de_documento, cliente_denominacion,
	items, total_gravada, total_igv, total,
	empresaRuc, razonSocial, direccion,
}) => {
	const tipoDoc = tipoDocumento === "factura" ? "01" : "03";
	const documentoId = `${serie}-${String(numero).padStart(8, "0")}`;
	const fecha = String(fecha_de_emision || new Date().toISOString().slice(0, 10));
	const hora = new Date().toTimeString().slice(0, 8);

	return {
		"cbc:UBLVersionID": textNode("2.1"),
		"cbc:CustomizationID": textNode("2.0"),
		"cbc:ID": textNode(documentoId),
		"cbc:IssueDate": textNode(fecha),
		"cbc:IssueTime": textNode(hora),
		"cbc:InvoiceTypeCode": textNode(tipoDoc, { listID: "0101" }),
		"cbc:Note": [{ _text: formatearLegenda(total), _attributes: { languageLocaleID: "1000" } }],
		"cbc:DocumentCurrencyCode": textNode("PEN"),

		"cac:AccountingSupplierParty": {
			"cac:Party": {
				"cac:PartyIdentification": {
					"cbc:ID": textNode(String(empresaRuc), { schemeID: "6" }),
				},
				"cac:PartyLegalEntity": {
					"cbc:RegistrationName": textNode(String(razonSocial)),
					"cac:RegistrationAddress": {
						"cbc:AddressTypeCode": textNode("0000"),
						"cac:AddressLine": { "cbc:Line": textNode(String(direccion || "")) },
					},
				},
			},
		},

		"cac:AccountingCustomerParty": {
			"cac:Party": {
				"cac:PartyIdentification": {
					"cbc:ID": textNode(String(cliente_numero_de_documento), { schemeID: String(cliente_tipo_de_documento) }),
				},
				"cac:PartyLegalEntity": {
					"cbc:RegistrationName": textNode(String(cliente_denominacion)),
					"cac:RegistrationAddress": {
						"cac:AddressLine": { "cbc:Line": textNode("") },
					},
				},
			},
		},

		"cac:TaxTotal": {
			"cbc:TaxAmount": textNode(Number(total_igv), { currencyID: "PEN" }),
			"cac:TaxSubtotal": [{
				"cbc:TaxableAmount": textNode(Number(total_gravada), { currencyID: "PEN" }),
				"cbc:TaxAmount": textNode(Number(total_igv), { currencyID: "PEN" }),
				"cac:TaxCategory": {
					"cac:TaxScheme": {
						"cbc:ID": textNode("1000"),
						"cbc:Name": textNode("IGV"),
						"cbc:TaxTypeCode": textNode("VAT"),
					},
				},
			}],
		},

		"cac:LegalMonetaryTotal": {
			"cbc:LineExtensionAmount": textNode(Number(total_gravada), { currencyID: "PEN" }),
			"cbc:TaxInclusiveAmount": textNode(Number(total), { currencyID: "PEN" }),
			"cbc:PayableAmount": textNode(Number(total), { currencyID: "PEN" }),
		},

		"cac:InvoiceLine": items.map((item, index) => {
			const cantidad = Number(item.cantidad);
			const precioUnitario = Number(item.precio_unitario);
			const valorUnitario = Number((precioUnitario / 1.18).toFixed(2));
			const mtoValorVenta = Number((valorUnitario * cantidad).toFixed(2));
			const igv = Number((mtoValorVenta * 0.18).toFixed(2));

			return {
				"cbc:ID": textNode(index + 1),
				"cbc:InvoicedQuantity": textNode(cantidad, { unitCode: "NIU" }),
				"cbc:LineExtensionAmount": textNode(mtoValorVenta, { currencyID: "PEN" }),
				"cac:PricingReference": {
					"cac:AlternativeConditionPrice": {
						"cbc:PriceAmount": textNode(precioUnitario, { currencyID: "PEN" }),
						"cbc:PriceTypeCode": textNode("01"),
					},
				},
				"cac:TaxTotal": {
					"cbc:TaxAmount": textNode(igv, { currencyID: "PEN" }),
					"cac:TaxSubtotal": [{
						"cbc:TaxableAmount": textNode(mtoValorVenta, { currencyID: "PEN" }),
						"cbc:TaxAmount": textNode(igv, { currencyID: "PEN" }),
						"cac:TaxCategory": {
							"cbc:Percent": textNode(18),
							"cbc:TaxExemptionReasonCode": textNode("10"),
							"cac:TaxScheme": {
								"cbc:ID": textNode("1000"),
								"cbc:Name": textNode("IGV"),
								"cbc:TaxTypeCode": textNode("VAT"),
							},
						},
					}],
				},
				"cac:Item": { "cbc:Description": textNode(item.descripcion) },
				"cac:Price": { "cbc:PriceAmount": textNode(valorUnitario, { currencyID: "PEN" }) },
			};
		}),
	};
};

// ✅ NUEVA función: pide el PDF a APISUNAT usando el documentId
const descargarPdf = async (documentId, fileName, format = "ticket80mm") => {
	const url = `${APISUNAT_BASE_URL}/documents/${documentId}/getPDF/${format}/${fileName}.pdf`;
	const response = await fetch(url);

	if (!response.ok) {
		throw new Error(`No se pudo obtener el PDF (status ${response.status})`);
	}

	const buffer = await response.arrayBuffer();
	const base64 = Buffer.from(buffer).toString("base64");
	return `data:application/pdf;base64,${base64}`;
};

const emitirDocumento = async (documento, payload) => {
	const token = APISUNAT_TOKEN;
	const personaId = APISUNAT_PERSONA_ID;
	const ruc = process.env.APISUNAT_RUC;
	const razonSocial = process.env.APISUNAT_COMPANY_NAME || "EMPRESA";
	const direccion = process.env.APISUNAT_COMPANY_ADDRESS || "DIRECCION";

	const tipoDoc = documento === "factura" ? "01" : "03";
	const fileName = `${ruc}-${tipoDoc}-${payload.serie}-${String(payload.numero).padStart(8, "0")}`;

	const documentBody = construirDocumentBody({
		tipoDocumento: documento,
		...payload,
		empresaRuc: ruc,
		razonSocial,
		direccion,
	});

	const requestBody = { personaId, personaToken: token, fileName, documentBody };

	const { response, data } = await enviarDocumento({
		endpoint: `${APISUNAT_BASE_URL}/personas/v1/sendBill`,
		requestBody,
	});

	if (!response.ok) {
		throw new Error(extraerMensajeError(data));
	}

	if (data?.status === "ERROR") {
		throw new Error(data?.error?.message || "APISUNAT rechazó el documento");
	}

	const documentId = data?.documentId;
	let pdf = null;

	if (documentId) {
		try {
			pdf = await descargarPdf(documentId, fileName);
		} catch (pdfError) {
			console.warn("Advertencia: no se pudo descargar el PDF:", pdfError.message);
			// La boleta se emitió igual — no cortamos el flujo
		}
	}

	return {
		success: true,
		status: data?.status || "PENDIENTE",
		documentId,
		fileName,
		pdf,
	};
};

export const emitirBoleta = async (payload) => emitirDocumento("boleta", payload);
export const emitirFactura = async (payload) => emitirDocumento("factura", payload);