import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog';
import { FileText, CheckCircle2, AlertCircle, Shield, Scale, Lock, Users } from 'lucide-react';

const TermsConditionsModal = ({ open, onOpenChange, onAccept }) => {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollTop + clientHeight >= scrollHeight - 20) {
      setHasScrolledToBottom(true);
    }
  };

  const handleAccept = () => {
    if (accepted) {
      onAccept();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl text-white">
            <FileText className="h-6 w-6 text-orange-500" />
            Conditions Générales d'Utilisation - ServisPro
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Veuillez lire attentivement les conditions avant de créer votre compte
          </DialogDescription>
        </DialogHeader>

        <ScrollArea 
          className="h-[50vh] pr-4 mt-4" 
          onScrollCapture={handleScroll}
        >
          <div className="space-y-6 text-sm text-slate-300">
            {/* Section 1 */}
            <section>
              <h3 className="flex items-center gap-2 text-lg font-bold text-white mb-3">
                <Users className="h-5 w-5 text-orange-500" />
                1. Vos droits et obligations
              </h3>
              <p className="mb-3 text-slate-400">
                Lorsque vous utilisez ServisPro, vous acceptez un contrat qui définit ce que vous êtes autorisé à faire et ce qui est interdit.
              </p>
              
              <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-4 mb-3">
                <h4 className="font-semibold text-green-400 mb-2">✅ Vos droits</h4>
                <ul className="list-disc list-inside space-y-1 text-slate-300">
                  <li>Vous pouvez vous inscrire et utiliser la plateforme pour rechercher, proposer ou demander des services.</li>
                  <li>Vous pouvez utiliser les fonctionnalités de ServisPro : publication de services, réception et envoi d'offres, messagerie, notifications, évaluations et commentaires.</li>
                  <li>Vous pouvez résilier votre compte à tout moment, conformément aux conditions prévues par ServisPro.</li>
                </ul>
              </div>

              <div className="bg-orange-900/20 border border-orange-700/50 rounded-lg p-4">
                <h4 className="font-semibold text-orange-400 mb-2">⚠️ Vos obligations</h4>
                <ul className="list-disc list-inside space-y-1 text-slate-300">
                  <li>Vous devez avoir au moins <strong className="text-white">18 ans</strong> et être légalement capable de conclure des contrats.</li>
                  <li>Vous êtes responsable de la confidentialité et de la sécurité de vos identifiants de connexion.</li>
                  <li>Vous ne devez pas publier de contenu illégal, offensant, trompeur, diffamatoire, inexact ou portant atteinte aux droits de tiers.</li>
                  <li>Vous devez payer tous les frais acceptés et assumez l'entière responsabilité des transactions que vous initiez sur la plateforme.</li>
                  <li><strong className="text-orange-400">Toute violation de ces obligations peut entraîner la suspension ou la suppression de votre compte.</strong></li>
                </ul>
              </div>
            </section>

            {/* Section 2 */}
            <section>
              <h3 className="flex items-center gap-2 text-lg font-bold text-white mb-3">
                <Shield className="h-5 w-5 text-blue-500" />
                2. Conditions d'utilisation de la plateforme
              </h3>
              <p className="mb-3">
                ServisPro est une <strong className="text-white">plateforme technologique d'intermédiation</strong> qui met en relation :
              </p>
              <ul className="list-disc list-inside mb-3 text-slate-300">
                <li>les <strong className="text-white">Utilisateurs de services</strong> (clients)</li>
                <li>et les <strong className="text-white">Prestataires de services</strong> (professionnels)</li>
              </ul>
              <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
                <p className="text-slate-300">
                  <strong className="text-blue-400">À ce titre :</strong> ServisPro n'emploie pas les prestataires de services et n'est pas partie aux contrats conclus entre les utilisateurs. Vous reconnaissez que ServisPro se limite à faciliter la mise en relation et à accompagner le processus de réalisation des services.
                </p>
              </div>
            </section>

            {/* Section 3 */}
            <section>
              <h3 className="flex items-center gap-2 text-lg font-bold text-white mb-3">
                <Scale className="h-5 w-5 text-purple-500" />
                3. Règles pour demander et fournir des services
              </h3>
              
              <div className="bg-purple-900/20 border border-purple-700/50 rounded-lg p-4 mb-3">
                <h4 className="font-semibold text-purple-400 mb-2">Pour les prestataires de services</h4>
                <ul className="list-disc list-inside space-y-1 text-slate-300">
                  <li>Ne pas fournir d'informations fausses ou trompeuses concernant leurs compétences, offres ou localisation.</li>
                  <li>Proposer uniquement des services correspondant à leurs compétences réelles.</li>
                  <li><strong className="text-red-400">Il est strictement interdit de contourner les frais de ServisPro.</strong></li>
                  <li><strong className="text-red-400">Il est interdit de négocier ou conclure des contrats avec les clients en dehors de la plateforme.</strong></li>
                  <li>Toute violation peut entraîner la résiliation immédiate du compte et des poursuites judiciaires.</li>
                </ul>
              </div>

              <div className="bg-cyan-900/20 border border-cyan-700/50 rounded-lg p-4 mb-3">
                <h4 className="font-semibold text-cyan-400 mb-2">Pour les utilisateurs de services</h4>
                <ul className="list-disc list-inside space-y-1 text-slate-300">
                  <li>Ne pas demander de services sans intention réelle de paiement.</li>
                  <li>Respecter les conditions convenues avec le prestataire.</li>
                </ul>
              </div>

              <div className="bg-slate-800 border border-slate-600 rounded-lg p-4">
                <h4 className="font-semibold text-white mb-2">Pour toutes les parties</h4>
                <p className="text-slate-300">
                  Les utilisateurs doivent adopter un comportement respectueux, honnête et conforme aux règles de communication de ServisPro.
                </p>
              </div>
            </section>

            {/* Section 4 */}
            <section>
              <h3 className="flex items-center gap-2 text-lg font-bold text-white mb-3">
                <AlertCircle className="h-5 w-5 text-red-500" />
                4. Limitation de responsabilité
              </h3>
              <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4">
                <p className="text-slate-300 mb-2">
                  Dans les limites autorisées par la loi, ServisPro ne saurait être tenue responsable des dommages directs ou indirects résultant :
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-300">
                  <li>de l'utilisation de la plateforme,</li>
                  <li>ou des services fournis par les prestataires et les clients.</li>
                </ul>
                <p className="mt-3 text-slate-400 text-xs">
                  ServisPro peut intervenir pour faciliter la résolution des litiges. La responsabilité totale de ServisPro est limitée au montant total des frais effectivement payés. La plateforme est fournie « en l'état », sans garantie expresse ou implicite.
                </p>
              </div>
            </section>

            {/* Section 5 */}
            <section>
              <h3 className="flex items-center gap-2 text-lg font-bold text-white mb-3">
                <Lock className="h-5 w-5 text-teal-500" />
                5. Droit applicable, litiges et protection des données
              </h3>
              
              <div className="space-y-3">
                <div className="bg-teal-900/20 border border-teal-700/50 rounded-lg p-4">
                  <h4 className="font-semibold text-teal-400 mb-2">📍 Droit applicable</h4>
                  <p className="text-slate-300">
                    Les présentes Conditions sont régies par le droit du pays à partir duquel vous accédez à la plateforme. Si vous accédez à ServisPro depuis la <strong className="text-white">Guinée Conakry</strong>, le droit guinéen s'applique.
                  </p>
                </div>

                <div className="bg-teal-900/20 border border-teal-700/50 rounded-lg p-4">
                  <h4 className="font-semibold text-teal-400 mb-2">⚖️ Règlement des litiges</h4>
                  <p className="text-slate-300">
                    Tout litige sera soumis aux juridictions compétentes du pays d'accès (Guinée), conformément aux lois locales en vigueur.
                  </p>
                </div>

                <div className="bg-teal-900/20 border border-teal-700/50 rounded-lg p-4">
                  <h4 className="font-semibold text-teal-400 mb-2">🔒 Protection des données</h4>
                  <p className="text-slate-300">
                    ServisPro s'engage à protéger les données personnelles des utilisateurs conformément aux lois applicables. Les informations collectées sont utilisées uniquement dans le cadre du fonctionnement de la plateforme.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 6 - Visit Fees */}
            <section>
              <h3 className="flex items-center gap-2 text-lg font-bold text-white mb-3">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Frais de déplacement (Location & Services)
              </h3>
              <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-4">
                <p className="text-slate-300 mb-3">
                  Les frais de déplacement correspondent au montant payé par le Client afin de couvrir :
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-300 mb-3">
                  <li>le déplacement du professionnel ou de l'agent</li>
                  <li>le temps consacré à la visite ou à l'évaluation</li>
                  <li>la réservation du créneau de rendez-vous</li>
                  <li>l'organisation et l'accès au lieu concerné</li>
                </ul>
                <p className="text-orange-300 font-medium">
                  ⚠️ Le Client accepte que ces frais soient payés avant tout déplacement ou avant la confirmation du rendez-vous.
                </p>
                <p className="mt-3 text-slate-400 text-xs">
                  <strong>Important :</strong> Une fois la visite réalisée, toutes les discussions, négociations, accords et paiements supplémentaires entre le Client et le Prestataire relèvent exclusivement de leur responsabilité. ServisPro Guinée n'est pas responsable des échanges effectués après la visite.
                </p>
              </div>
            </section>
          </div>
        </ScrollArea>

        <DialogFooter className="flex flex-col gap-4 pt-4 border-t border-slate-700">
          {!hasScrolledToBottom && (
            <p className="text-xs text-orange-400 text-center w-full">
              ⬇️ Faites défiler vers le bas pour lire toutes les conditions
            </p>
          )}
          
          <div className="flex items-center gap-3 w-full">
            <Checkbox 
              id="terms-accept"
              checked={accepted}
              onCheckedChange={setAccepted}
              disabled={!hasScrolledToBottom}
              className="border-orange-500 data-[state=checked]:bg-orange-500"
            />
            <label 
              htmlFor="terms-accept" 
              className={`text-sm ${hasScrolledToBottom ? 'text-white cursor-pointer' : 'text-slate-500'}`}
            >
              J'ai lu et j'accepte les Conditions Générales d'Utilisation de ServisPro
            </label>
          </div>

          <div className="flex gap-3 w-full">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              Annuler
            </Button>
            <Button
              onClick={handleAccept}
              disabled={!accepted || !hasScrolledToBottom}
              className="flex-1 bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Accepter et Continuer
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TermsConditionsModal;
