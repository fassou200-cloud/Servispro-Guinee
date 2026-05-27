import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Shield, FileText, ExternalLink, Eye, Upload, CheckCircle, XCircle
} from 'lucide-react';
import { getImageUrl } from '@/utils/imageUrl';

// Document Upload Card Component (extracted from CompanyDashboard)
const DocumentUploadCard = ({ title, document: docPath, docType, onUpload, required, isImage, BACKEND_URL }) => {
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    await onUpload(docType, file);
    setUploading(false);
  };

  return (
    <div className="p-6 bg-muted rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className={`h-5 w-5 ${docPath ? 'text-green-600' : 'text-muted-foreground'}`} />
          <span className="font-medium text-foreground">{title}</span>
          {required && <span className="text-red-500">*</span>}
        </div>
        {docPath ? (
          <CheckCircle className="h-5 w-5 text-green-600" />
        ) : (
          <XCircle className="h-5 w-5 text-muted-foreground" />
        )}
      </div>

      {isImage && docPath && (
        <div className="mb-4">
          <img src={getImageUrl(docPath, 'thumb')} alt={title} className="h-24 w-24 object-cover rounded-lg" />
        </div>
      )}

      <div className="flex gap-2">
        {docPath && (
          <a
            href={`${BACKEND_URL}${docPath}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1"
          >
            <Button variant="outline" className="w-full">
              <Eye className="h-4 w-4 mr-2" />
              Voir
            </Button>
          </a>
        )}
        <div className="flex-1">
          <input
            type="file"
            accept={isImage ? "image/*" : ".pdf,.jpg,.jpeg,.png"}
            onChange={handleFileChange}
            className="hidden"
            id={`doc-${docType}`}
          />
          <Button
            variant="outline"
            className="w-full"
            onClick={() => window.document.getElementById(`doc-${docType}`).click()}
            disabled={uploading}
          >
            <Upload className="h-4 w-4 mr-2" />
            {uploading ? 'Envoi...' : docPath ? 'Remplacer' : 'Télécharger'}
          </Button>
        </div>
      </div>
    </div>
  );
};

const CompanyDocumentsTab = ({ company, handleDocumentUpload, BACKEND_URL }) => {
  return (
    <Card className="p-8">
      <h3 className="text-2xl font-heading font-bold text-foreground mb-6 flex items-center gap-2">
        <Shield className="h-6 w-6 text-primary" />
        Documents de l'Entreprise
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DocumentUploadCard
          title="Logo de l'Entreprise"
          document={company.logo}
          docType="logo"
          onUpload={handleDocumentUpload}
          isImage
          BACKEND_URL={BACKEND_URL}
        />
        <DocumentUploadCard
          title="Licence d'Exploitation"
          document={company.licence_exploitation}
          docType="licence_exploitation"
          onUpload={handleDocumentUpload}
          required
          BACKEND_URL={BACKEND_URL}
        />
        <DocumentUploadCard
          title="Document RCCM"
          document={company.rccm_document}
          docType="rccm_document"
          onUpload={handleDocumentUpload}
          required
          BACKEND_URL={BACKEND_URL}
        />
        <DocumentUploadCard
          title="Document NIF"
          document={company.nif_document}
          docType="nif_document"
          onUpload={handleDocumentUpload}
          BACKEND_URL={BACKEND_URL}
        />
        <DocumentUploadCard
          title="Attestation de Régularité Fiscale"
          document={company.attestation_fiscale}
          docType="attestation_fiscale"
          onUpload={handleDocumentUpload}
          BACKEND_URL={BACKEND_URL}
        />
      </div>

      {company.documents_additionnels && company.documents_additionnels.length > 0 && (
        <div className="mt-8">
          <h4 className="font-heading font-bold text-foreground mb-4">Autres Documents</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {company.documents_additionnels.map((doc, idx) => (
              <a
                key={idx}
                href={`${BACKEND_URL}${doc}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 bg-muted rounded-xl hover:bg-muted/80 transition-colors flex items-center gap-3"
              >
                <FileText className="h-5 w-5 text-primary" />
                <span className="text-foreground">Document {idx + 1}</span>
                <ExternalLink className="h-4 w-4 text-muted-foreground ml-auto" />
              </a>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};

export default CompanyDocumentsTab;
